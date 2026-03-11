import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
    @Prop({ required: true })
    name: string;

    @Prop()
    description: string;

    @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
    ownerId: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: "User" }], default: [] })
    members: Types.ObjectId[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ ownerId: 1, _id: -1 });
ProjectSchema.index({ members: 1, _id: -1 });
