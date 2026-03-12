import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { CommentResponseDto } from "./dto/comment.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { plainToInstance } from "class-transformer";
import { CommentDocument } from "./schemas/comment.schema";
import { ParseMongoIdPipe } from "../common/pipes/parse-mongo-id.pipe";

@ApiTags("Comments")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("comments")
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) {}

    @Post()
    @ApiOperation({ summary: "Create a comment for a task" })
    @ApiResponse({ status: 201, type: CommentResponseDto })
    @ApiResponse({ status: 404, description: "Task not found or access denied" })
    async create(
        @Body() createCommentDto: CreateCommentDto,
        @CurrentUser("userId") userId: string,
    ): Promise<CommentResponseDto> {
        const comment = await this.commentsService.create(createCommentDto, userId);
        return plainToInstance(CommentResponseDto, comment.toJSON(), { excludeExtraneousValues: true });
    }

    @Get("task/:taskId")
    @ApiOperation({ summary: "Get all comments for a task" })
    @ApiResponse({ status: 200, type: [CommentResponseDto] })
    @ApiResponse({ status: 404, description: "Task not found or access denied" })
    async findAllByTask(
        @Param("taskId", ParseMongoIdPipe) taskId: string,
        @CurrentUser("userId") userId: string,
    ): Promise<CommentResponseDto[]> {
        const comments = await this.commentsService.findAllByTask(taskId, userId);
        return comments.map((c: CommentDocument) =>
            plainToInstance(CommentResponseDto, c.toJSON(), { excludeExtraneousValues: true }),
        );
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update own comment" })
    @ApiResponse({ status: 200, type: CommentResponseDto })
    @ApiResponse({ status: 403, description: "Only author can edit comment" })
    async update(
        @Param("id", ParseMongoIdPipe) id: string,
        @Body() updateCommentDto: UpdateCommentDto,
        @CurrentUser("userId") userId: string,
    ): Promise<CommentResponseDto> {
        const comment = await this.commentsService.update(id, userId, updateCommentDto);
        return plainToInstance(CommentResponseDto, comment.toJSON(), { excludeExtraneousValues: true });
    }

    @Delete(":id")
    @ApiOperation({ summary: "Delete own comment" })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 403, description: "Only author can delete comment" })
    async remove(@Param("id", ParseMongoIdPipe) id: string, @CurrentUser("userId") userId: string): Promise<void> {
        await this.commentsService.remove(id, userId);
    }
}
