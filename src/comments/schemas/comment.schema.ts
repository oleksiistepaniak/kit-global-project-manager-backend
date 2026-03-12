import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
    @Prop({ required: true, trim: true })
    text: string;

    @Prop({ type: Types.ObjectId, ref: "Task", required: true, index: true })
    taskId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "User", required: true })
    authorId: Types.ObjectId;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
