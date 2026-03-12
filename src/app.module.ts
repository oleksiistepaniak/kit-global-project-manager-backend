import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ProjectsModule } from "./projects/projects.module";
import { TasksModule } from "./tasks/tasks.module";
import { CommentsModule } from "./comments/comments.module";
import { AppConfig } from "./config/app.config";

@Module({
    imports: [MongooseModule.forRoot(AppConfig.mongoUri), AuthModule, ProjectsModule, TasksModule, CommentsModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
