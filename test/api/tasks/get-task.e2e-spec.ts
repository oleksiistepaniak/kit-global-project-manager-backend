// noinspection DuplicatedCode

import request from "supertest";
import { getModelToken } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { Task, TaskDocument } from "../../../src/tasks/schemas/task.schema";
import { TaskResponseDto } from "../../../src/tasks/dto/task.dto";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";

describe("TasksController GET /tasks/:id", () => {
    let env: TestEnv;
    let projectModel: Model<ProjectDocument>;
    let taskModel: Model<TaskDocument>;

    let targetProjectId: string;
    let alienProjectId: string;

    let mainTaskId: string; // task with location
    let subTaskId: string; // subtask
    let alienTaskId: string; // task in another project

    beforeAll(async () => {
        env = await setupTestEnvironment();
        projectModel = env.app.get<Model<ProjectDocument>>(getModelToken(Project.name));
        taskModel = env.app.get<Model<TaskDocument>>(getModelToken(Task.name));
    });

    afterAll(async () => {
        if (env) {
            await env.dbConnection.collection("users").deleteMany({});
            await projectModel.deleteMany({});
            await taskModel.deleteMany({});
            await env.app.close();
        }
    });

    beforeEach(async () => {
        await projectModel.deleteMany({});
        await taskModel.deleteMany({});

        const project1 = await projectModel.create({
            name: "Alpha Project",
            ownerId: env.user1.userId,
            members: [env.user2.userId],
        });
        targetProjectId = project1.id;

        const project3 = await projectModel.create({
            name: "Omega Secret Project",
            ownerId: env.user3.userId,
        });
        alienProjectId = project3.id;

        const task1 = await taskModel.create({
            title: "Main Epic Task",
            description: "Has location",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
            location: { type: "Point", coordinates: [24.0311, 49.8397] },
        });
        mainTaskId = task1.id;

        const task2 = await taskModel.create({
            title: "Small Subtask",
            projectId: targetProjectId,
            ownerId: env.user2.userId,
            parentTaskId: task1.id,
        });
        subTaskId = task2.id;

        const task3 = await taskModel.create({
            title: "Alien Task",
            projectId: alienProjectId,
            ownerId: env.user3.userId,
        });
        alienTaskId = task3.id;
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .get(`/tasks/${mainTaskId}`)
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toStrictEqual(["unauthorized"]);
            });
    });

    it("task_not_found_wrong_id", () => {
        const fakeId = new Types.ObjectId().toHexString();
        return request(env.httpServer)
            .get(`/tasks/${fakeId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("task_not_found");
            });
    });

    it("access_denied_to_task_project", () => {
        return request(env.httpServer)
            .get(`/tasks/${alienTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("project_not_found");
            });
    });

    it("success_get_main_task_by_member_with_location", () => {
        // member retrieves a task of owner
        return request(env.httpServer)
            .get(`/tasks/${mainTaskId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as TaskResponseDto;

                // check client response
                expect(body.id).toBe(mainTaskId);
                expect(body.title).toBe("Main Epic Task");
                expect(body.projectId).toBe(targetProjectId);
                expect(body.ownerId).toBe(env.user1.userId);

                expect(body.parentTaskId).toBeNull();

                expect(body.location).toBeDefined();
                expect(body.location?.type).toBe("Point");
                expect(body.location?.coordinates).toEqual([24.0311, 49.8397]);
            });
    });

    it("success_get_subtask_by_owner", () => {
        // owner retrieves a task of member
        return request(env.httpServer)
            .get(`/tasks/${subTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as TaskResponseDto;

                // check client response
                expect(body.id).toBe(subTaskId);
                expect(body.title).toBe("Small Subtask");

                expect(body.parentTaskId).toBe(mainTaskId);
            });
    });
});
