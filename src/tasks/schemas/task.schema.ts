import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TaskDocument = Task & Document;

@Schema({ _id: false })
export class GeoLocation {
    @Prop({ type: String, enum: ["Point"], default: "Point" })
    type: string;

    @Prop({ type: [Number], required: true })
    coordinates: number[];
}

@Schema({ timestamps: true })
export class Task {
    @Prop({ required: true, trim: true })
    title: string;

    @Prop({ trim: true })
    description: string;

    @Prop({ enum: ["TODO", "IN_PROGRESS", "DONE"], default: "TODO" })
    status: string;

    @Prop()
    deadline?: Date;

    @Prop({ type: [String], default: [] })
    tags: string[];

    @Prop({ type: Types.ObjectId, ref: "Project", required: true, index: true })
    projectId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
    ownerId: Types.ObjectId;

    @Prop({ type: SchemaFactory.createForClass(GeoLocation), index: "2dsphere" })
    location?: GeoLocation;

    @Prop({ type: Types.ObjectId, ref: "Task", default: null, index: true })
    parentTaskId?: Types.ObjectId;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

TaskSchema.index({ projectId: 1, createdAt: -1, _id: -1 });
TaskSchema.index({ projectId: 1, deadline: -1, _id: -1 });
TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ projectId: 1, tags: 1 });
