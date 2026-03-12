import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Task, TaskDocument } from "./schemas/task.schema";
import { ProjectsService } from "../projects/projects.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { GetTasksQueryDto } from "./dto/get-tasks-query.dto";
import { CommentDocument, Comment } from "../comments/schemas/comment.schema";

interface GetProjectAnalyticsResult {
    total: { count: number }[];
    byStatus: { _id: string; count: number }[];
    overdue: { count: number }[];
    topTags: { _id: string; count: number }[];
}

@Injectable()
export class TasksService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
        private projectsService: ProjectsService,
    ) {}

    async create(createTaskDto: CreateTaskDto, userId: string): Promise<TaskDocument> {
        await this.projectsService.findOne(createTaskDto.projectId, userId);

        if (createTaskDto.parentTaskId) {
            const parentTask = await this.taskModel.findById(createTaskDto.parentTaskId).exec();

            if (!parentTask) throw new NotFoundException(["parent_task_not_found"]);

            if (parentTask.projectId.toString() !== createTaskDto.projectId)
                throw new ForbiddenException(["subtask_must_belong_to_same_project"]);
        }

        const createdTask = await this.taskModel.create({
            ...createTaskDto,
            ownerId: userId,
        });

        return createdTask;
    }

    async findAllByProject(
        projectId: string,
        userId: string,
        queryDto: GetTasksQueryDto,
    ): Promise<{ data: TaskDocument[]; nextCursor: string | null }> {
        await this.projectsService.findOne(projectId, userId);

        const {
            limit = 10,
            cursor,
            search,
            status,
            tags,
            sortBy = "createdAt",
            sortOrder = "desc",
            lat,
            lng,
            radius = 5000,
        } = queryDto;

        const sortDirection = sortOrder === "desc" ? -1 : 1;
        const operator = sortOrder === "desc" ? "$lt" : "$gt";

        let cursorCondition = {};
        if (cursor) {
            const cursorDoc = await this.taskModel.findById(cursor).exec();
            if (cursorDoc) {
                cursorCondition = { [sortBy]: { [operator]: cursorDoc[sortBy as keyof TaskDocument] } };
            }
        }

        const isGeoQuery = lat !== undefined && lng !== undefined;
        const geoCondition = isGeoQuery
            ? {
                  location: {
                      $near: {
                          $geometry: { type: "Point", coordinates: [lng, lat] },
                          $maxDistance: radius,
                      },
                  },
              }
            : {};

        const tasks = await this.taskModel
            .find({
                projectId,
                ...geoCondition,
                ...cursorCondition,
                ...(status?.length && { status: { $in: status } }),
                ...(tags?.length && { tags: { $in: tags } }),
                ...(search && {
                    $or: [
                        { title: { $regex: search, $options: "i" } },
                        { description: { $regex: search, $options: "i" } },
                    ],
                }),
            })
            .sort(isGeoQuery ? {} : { [sortBy]: sortDirection, _id: sortDirection })
            .limit(limit + 1)
            .exec();

        let nextCursor: string | null = null;
        if (tasks.length > limit) {
            nextCursor = tasks[limit - 1]._id.toString();
            tasks.pop();
        }

        return { data: tasks, nextCursor };
    }

    async getProjectAnalytics(projectId: string, userId: string) {
        await this.projectsService.findOne(projectId, userId);

        const now = new Date();

        const result = await this.taskModel
            .aggregate<GetProjectAnalyticsResult>([
                {
                    $match: {
                        $or: [{ projectId: projectId }, { projectId: new Types.ObjectId(projectId) }],
                    },
                },
                {
                    $facet: {
                        total: [{ $count: "count" }],

                        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],

                        overdue: [
                            {
                                $match: {
                                    deadline: { $lt: now },
                                    status: { $ne: "DONE" },
                                },
                            },
                            { $count: "count" },
                        ],

                        topTags: [
                            { $unwind: "$tags" },
                            { $group: { _id: "$tags", count: { $sum: 1 } } },
                            { $sort: { count: -1 } },
                            { $limit: 5 },
                        ],
                    },
                },
            ])
            .exec();

        const facetData: GetProjectAnalyticsResult = result[0];

        return {
            totalTasks: facetData.total[0]?.count || 0,
            overdueTasks: facetData.overdue[0]?.count || 0,
            statusCounts: facetData.byStatus.map((item) => ({
                status: item._id,
                count: item.count,
            })),
            topTags: facetData.topTags.map((item) => ({
                tag: item._id,
                count: item.count,
            })),
        };
    }

    async findOne(id: string, userId: string): Promise<TaskDocument> {
        const task = await this.taskModel.findById(id).exec();

        if (!task) throw new NotFoundException(["task_not_found"]);

        await this.projectsService.findOne(task.projectId.toString(), userId);

        return task;
    }

    async update(id: string, userId: string, updateTaskDto: UpdateTaskDto): Promise<TaskDocument> {
        const task = await this.findOne(id, userId);

        const targetProjectId = updateTaskDto.projectId || task.projectId.toString();

        if (updateTaskDto.projectId && updateTaskDto.projectId !== task.projectId.toString()) {
            await this.projectsService.findOne(updateTaskDto.projectId, userId);
        }

        if (updateTaskDto.parentTaskId && updateTaskDto.parentTaskId !== task.parentTaskId?.toString()) {
            if (updateTaskDto.parentTaskId === id) throw new BadRequestException(["task_cannot_be_its_own_parent"]);

            const parentTask = await this.taskModel.findById(updateTaskDto.parentTaskId).exec();

            if (!parentTask) throw new NotFoundException(["parent_task_not_found"]);

            if (parentTask.projectId.toString() !== targetProjectId)
                throw new ForbiddenException(["subtask_must_belong_to_same_project"]);
        }

        const updatedTask = (await this.taskModel
            .findByIdAndUpdate(id, updateTaskDto, { returnDocument: "after" })
            .exec()) as TaskDocument;

        return updatedTask;
    }

    async remove(id: string, userId: string): Promise<void> {
        const task = await this.findOne(id, userId);
        const project = await this.projectsService.findOne(task.projectId.toString(), userId);

        if (task.ownerId.toString() !== userId && project.ownerId.toString() !== userId)
            throw new ForbiddenException(["only_task_author_or_project_owner_can_delete"]);

        const subtasks = await this.taskModel.find({ parentTaskId: id }).select("_id").exec();
        const taskIdsToDelete = [id, ...subtasks.map((t) => t._id.toString())];

        await this.commentModel.deleteMany({ taskId: { $in: taskIdsToDelete } }).exec();

        await this.taskModel.deleteMany({ parentTaskId: id }).exec();

        await this.taskModel.findByIdAndDelete(id).exec();
    }
}
