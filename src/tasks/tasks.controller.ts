import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TaskResponseDto } from "./dto/task.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { plainToInstance } from "class-transformer";
import { TaskDocument } from "./schemas/task.schema";
import { PaginatedTasksResponseDto } from "./dto/paginated-tasks.dto";
import { GetTasksQueryDto } from "./dto/get-tasks-query.dto";
import { ParseMongoIdPipe } from "../common/pipes/parse-mongo-id.pipe";

@ApiTags("Tasks")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("tasks")
export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Post()
    @ApiOperation({ summary: "Create a new task in a project" })
    @ApiResponse({ status: 201, description: "Task was created successfully", type: TaskResponseDto })
    @ApiResponse({ status: 400, description: "Invalid task params (e.g., wrong GeoJSON format)" })
    @ApiResponse({ status: 403, description: "Forbidden to create a subtask for a different project" })
    @ApiResponse({ status: 404, description: "Project or parent task not found" })
    async create(
        @Body() createTaskDto: CreateTaskDto,
        @CurrentUser("userId") userId: string,
    ): Promise<TaskResponseDto> {
        const task = await this.tasksService.create(createTaskDto, userId);

        return plainToInstance(TaskResponseDto, task.toJSON(), { excludeExtraneousValues: true });
    }

    @Get("project/:projectId")
    @ApiOperation({ summary: "Retrieve all tasks for a specific project with filters, sorting, and pagination" })
    @ApiResponse({ status: 200, description: "Tasks retrieved successfully", type: PaginatedTasksResponseDto })
    @ApiResponse({ status: 400, description: "Invalid query parameters" })
    @ApiResponse({ status: 404, description: "Project not found or access denied" })
    async findAllByProject(
        @Param("projectId", ParseMongoIdPipe) projectId: string,
        @Query() query: GetTasksQueryDto,
        @CurrentUser("userId") userId: string,
    ): Promise<PaginatedTasksResponseDto> {
        const { data, nextCursor } = await this.tasksService.findAllByProject(projectId, userId, query);

        return {
            data: data.map((t: TaskDocument) =>
                plainToInstance(TaskResponseDto, t.toJSON(), { excludeExtraneousValues: true }),
            ),
            nextCursor,
        };
    }

    @Get(":id")
    @ApiOperation({ summary: "Retrieve a task by id" })
    @ApiResponse({ status: 200, description: "Task was found successfully", type: TaskResponseDto })
    @ApiResponse({ status: 404, description: "Task not found or access denied" })
    async findOne(
        @Param("id", ParseMongoIdPipe) id: string,
        @CurrentUser("userId") userId: string,
    ): Promise<TaskResponseDto> {
        const task = await this.tasksService.findOne(id, userId);

        return plainToInstance(TaskResponseDto, task.toJSON(), { excludeExtraneousValues: true });
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update a task by id" })
    @ApiResponse({ status: 200, description: "Task was updated successfully", type: TaskResponseDto })
    @ApiResponse({ status: 400, description: "Invalid task params or self-parenting attempt" })
    @ApiResponse({ status: 403, description: "Forbidden cross-project operations" })
    @ApiResponse({ status: 404, description: "Task, project, or parent task not found" })
    async update(
        @Param("id", ParseMongoIdPipe) id: string,
        @Body() updateTaskDto: UpdateTaskDto,
        @CurrentUser("userId") userId: string,
    ): Promise<TaskResponseDto> {
        const task = await this.tasksService.update(id, userId, updateTaskDto);

        return plainToInstance(TaskResponseDto, task.toJSON(), { excludeExtraneousValues: true });
    }

    @Delete(":id")
    @ApiOperation({ summary: "Remove a task and its subtasks by id" })
    @ApiResponse({ status: 200, description: "Task was deleted successfully" })
    @ApiResponse({ status: 403, description: "Only task author or project owner can delete" })
    @ApiResponse({ status: 404, description: "Task not found or access denied" })
    async remove(@Param("id", ParseMongoIdPipe) id: string, @CurrentUser("userId") userId: string): Promise<void> {
        await this.tasksService.remove(id, userId);
    }
}
