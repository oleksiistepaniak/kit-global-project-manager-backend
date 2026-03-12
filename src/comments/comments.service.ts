import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Comment, CommentDocument } from "./schemas/comment.schema";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { TasksService } from "../tasks/tasks.service";

@Injectable()
export class CommentsService {
    constructor(
        @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
        private tasksService: TasksService,
    ) {}

    async create(createCommentDto: CreateCommentDto, userId: string): Promise<CommentDocument> {
        await this.tasksService.findOne(createCommentDto.taskId, userId);

        return this.commentModel.create({
            ...createCommentDto,
            authorId: userId,
        });
    }

    async findAllByTask(taskId: string, userId: string): Promise<CommentDocument[]> {
        await this.tasksService.findOne(taskId, userId);

        return this.commentModel.find({ taskId }).sort({ createdAt: 1 }).exec();
    }

    async update(id: string, userId: string, updateCommentDto: UpdateCommentDto): Promise<CommentDocument> {
        const comment = await this.commentModel.findById(id).exec();
        if (!comment) throw new NotFoundException(["comment_not_found"]);

        if (comment.authorId.toString() !== userId) throw new ForbiddenException(["only_author_can_edit_comment"]);

        return (await this.commentModel
            .findByIdAndUpdate(id, { text: updateCommentDto.text }, { returnDocument: "after" })
            .exec()) as CommentDocument;
    }

    async remove(id: string, userId: string): Promise<void> {
        const comment = await this.commentModel.findById(id).exec();
        if (!comment) throw new NotFoundException(["comment_not_found"]);

        if (comment.authorId.toString() !== userId) throw new ForbiddenException(["only_author_can_delete_comment"]);

        await this.commentModel.findByIdAndDelete(id).exec();
    }
}
