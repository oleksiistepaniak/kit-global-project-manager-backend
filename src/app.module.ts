import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ProjectsModule } from "./projects/projects.module";

@Module({
    // TODO: from config should be taken
    imports: [MongooseModule.forRoot("mongodb://localhost:27017/kit_global_task"), AuthModule, ProjectsModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
