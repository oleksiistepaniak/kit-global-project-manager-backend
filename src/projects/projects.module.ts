import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";
import { Project, ProjectSchema } from "./schemas/project.schema";
import { Task, TaskSchema } from "../tasks/schemas/task.schema";
import { Comment, CommentSchema } from "../comments/schemas/comment.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Project.name, schema: ProjectSchema },
            { name: Task.name, schema: TaskSchema },
            { name: Comment.name, schema: CommentSchema },
        ]),
    ],
    controllers: [ProjectsController],
    providers: [ProjectsService],
    exports: [ProjectsService],
})
export class ProjectsModule {}
