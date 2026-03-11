import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Project, ProjectDocument } from "./schemas/project.schema";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { GetProjectsQueryDto } from "./dto/get-projects-query.dto";

@Injectable()
export class ProjectsService {
    constructor(@InjectModel(Project.name) private projectModel: Model<ProjectDocument>) {}

    async create(createProjectDto: CreateProjectDto, userId: string): Promise<ProjectDocument> {
        const uniqueMembers = Array.from(new Set(createProjectDto.members || [])).filter(
            (memberId) => memberId !== userId,
        );

        const createdProject: ProjectDocument = await this.projectModel.create({
            ...createProjectDto,
            ownerId: userId,
            members: uniqueMembers,
        });

        return createdProject;
    }

    async findAll(
        userId: string,
        queryDto: GetProjectsQueryDto,
    ): Promise<{ data: ProjectDocument[]; nextCursor: string | null }> {
        const { name, description, sortOrder, cursor, limit = 10 } = queryDto;

        const sortDirection = sortOrder === "desc" ? -1 : 1;

        const projects = await this.projectModel
            .find({
                $or: [{ ownerId: userId }, { members: userId }],
                ...(name && { name: { $regex: name, $options: "i" } }),
                ...(description && { description: { $regex: description, $options: "i" } }),
                ...(cursor && { _id: sortOrder === "desc" ? { $lt: cursor } : { $gt: cursor } }),
            })
            .sort({ _id: sortDirection })
            .limit(limit + 1)
            .exec();

        let nextCursor: string | null = null;

        if (projects.length > limit) {
            nextCursor = projects[limit - 1]._id.toString();
            projects.pop();
        }

        return { data: projects, nextCursor };
    }

    async findOne(id: string, userId: string): Promise<ProjectDocument> {
        const project = await this.projectModel
            .findOne({
                _id: id,
                $or: [{ ownerId: userId }, { members: userId }],
            })
            .exec();

        if (!project) throw new NotFoundException(["project_not_found"]);

        return project;
    }

    async update(id: string, userId: string, updateProjectDto: UpdateProjectDto): Promise<ProjectDocument> {
        const project = await this.findOne(id, userId);

        if (project.ownerId.toString() !== userId) throw new ForbiddenException(["only_owner_can_update_project"]);

        const dataToUpdate = { ...updateProjectDto };
        if (updateProjectDto.members) {
            dataToUpdate.members = Array.from(new Set(updateProjectDto.members)).filter(
                (memberId) => memberId !== userId,
            );
        }

        const updatedProject = (await this.projectModel
            .findByIdAndUpdate(id, dataToUpdate, { returnDocument: "after" })
            .exec()) as ProjectDocument;

        return updatedProject;
    }

    async remove(id: string, userId: string): Promise<void> {
        const project = await this.findOne(id, userId);

        if (project.ownerId.toString() !== userId) throw new ForbiddenException(["only_owner_can_delete_project"]);

        await this.projectModel.findByIdAndDelete(id).exec();
    }
}
