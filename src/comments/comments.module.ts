import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";
import { Comment, CommentSchema } from "./schemas/comment.schema";
import { TasksModule } from "../tasks/tasks.module";

@Module({
    imports: [MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]), TasksModule],
    controllers: [CommentsController],
    providers: [CommentsService],
})
export class CommentsModule {}
