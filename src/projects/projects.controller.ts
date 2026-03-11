import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectResponseDto } from "./dto/project.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { plainToInstance } from "class-transformer";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PaginatedProjectsResponseDto } from "./dto/paginated-projects.dto";
import { GetProjectsQueryDto } from "./dto/get-projects-query.dto";

@ApiTags("Projects")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("projects")
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Post()
    @ApiOperation({ summary: "Create a new project" })
    @ApiResponse({ status: 201, description: "Project was created successfully" })
    @ApiResponse({ status: 400, description: "Invalid project params" })
    async create(
        @Body() createProjectDto: CreateProjectDto,
        @CurrentUser("userId") userId: string,
    ): Promise<ProjectResponseDto> {
        const project = await this.projectsService.create(createProjectDto, userId);

        return plainToInstance(ProjectResponseDto, project.toObject(), {
            excludeExtraneousValues: true,
        });
    }

    @Get()
    @ApiOperation({ summary: "Retrieve all projects by current user" })
    @ApiResponse({ status: 200, description: "projects retrieved successfully" })
    @ApiResponse({ status: 400, description: "Invalid project params" })
    async findAll(
        @CurrentUser("userId") userId: string,
        @Query() query: GetProjectsQueryDto,
    ): Promise<PaginatedProjectsResponseDto> {
        const { data, nextCursor } = await this.projectsService.findAll(userId, query);

        return {
            data: data.map((p) => plainToInstance(ProjectResponseDto, p.toObject(), { excludeExtraneousValues: true })),
            nextCursor,
        };
    }

    @Get(":id")
    @ApiOperation({ summary: "Retrieve a project by id" })
    @ApiResponse({ status: 200, description: "Project was found successfully" })
    @ApiResponse({ status: 404, description: "project not found or access denied" })
    async findOne(@Param("id") id: string, @CurrentUser("userId") userId: string): Promise<ProjectResponseDto> {
        const project = await this.projectsService.findOne(id, userId);

        return plainToInstance(ProjectResponseDto, project.toObject(), {
            excludeExtraneousValues: true,
        });
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update a project by id" })
    @ApiResponse({ status: 200, description: "Project was updated" })
    @ApiResponse({ status: 400, description: "Invalid project params" })
    @ApiResponse({ status: 404, description: "project not found or access denied" })
    async update(
        @Param("id") id: string,
        @Body() updateProjectDto: UpdateProjectDto,
        @CurrentUser("userId") userId: string,
    ): Promise<ProjectResponseDto> {
        const project = await this.projectsService.update(id, userId, updateProjectDto);

        return plainToInstance(ProjectResponseDto, project.toObject(), {
            excludeExtraneousValues: true,
        });
    }

    @Delete(":id")
    @ApiOperation({ summary: "Remove a project by id" })
    @ApiResponse({ status: 200, description: "Project was deleted" })
    @ApiResponse({ status: 404, description: "project not found or access denied" })
    remove(@Param("id") id: string, @CurrentUser("userId") userId: string): Promise<void> {
        return this.projectsService.remove(id, userId);
    }
}
