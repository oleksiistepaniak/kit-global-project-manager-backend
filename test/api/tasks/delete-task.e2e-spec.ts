// noinspection DuplicatedCode

import request from "supertest";
import { getModelToken } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { Task, TaskDocument } from "../../../src/tasks/schemas/task.schema";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";

describe("TasksController DELETE /tasks/:id", () => {
    let env: TestEnv;
    let projectModel: Model<ProjectDocument>;
    let taskModel: Model<TaskDocument>;

    let targetProjectId: string;
    let alienProjectId: string;

    let ownerTaskId: string; // owner task (user1)
    let memberTaskId: string; // member task (user2)
    let alienTaskId: string; // task in another project

    let parentTaskId: string; // parent task
    let subtaskIds: string[] = [];

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
            title: "Task by Owner",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
        });
        ownerTaskId = task1.id;

        const task2 = await taskModel.create({
            title: "Task by Member",
            projectId: targetProjectId,
            ownerId: env.user2.userId,
        });
        memberTaskId = task2.id;

        const task3 = await taskModel.create({
            title: "Alien Task",
            projectId: alienProjectId,
            ownerId: env.user3.userId,
        });
        alienTaskId = task3.id;

        const parent = await taskModel.create({
            title: "Parent Epic",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
        });
        parentTaskId = parent.id;

        const sub1 = await taskModel.create({
            title: "Subtask 1",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
            parentTaskId: parent.id,
        });
        const sub2 = await taskModel.create({
            title: "Subtask 2",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
            parentTaskId: parent.id,
        });
        subtaskIds = [sub1.id, sub2.id];
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .delete(`/tasks/${ownerTaskId}`)
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toStrictEqual(["unauthorized"]);
            });
    });

    it("task_not_found_wrong_id", () => {
        const fakeId = new Types.ObjectId().toHexString();
        return request(env.httpServer)
            .delete(`/tasks/${fakeId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("task_not_found");
            });
    });

    it("access_denied_to_task_project", () => {
        // user 1 is trying to delete a task in another project (no access)
        return request(env.httpServer)
            .delete(`/tasks/${alienTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("project_not_found");
            });
    });

    it("forbidden_for_member_to_delete_others_task", () => {
        // user 2 (member) is trying to delete an owner's task (user 1)
        return request(env.httpServer)
            .delete(`/tasks/${ownerTaskId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(403)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("only_task_author_or_project_owner_can_delete");
            });
    });

    it("success_delete_by_author", async () => {
        // user 2 has successfully deleted his task (member)
        await request(env.httpServer)
            .delete(`/tasks/${memberTaskId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(200);

        const taskInDb = await taskModel.findById(memberTaskId);
        expect(taskInDb).toBeNull();
    });

    it("success_delete_by_project_owner", async () => {
        // user 1 (owner) has successfully deleted task of member
        await request(env.httpServer)
            .delete(`/tasks/${memberTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200);

        const taskInDb = await taskModel.findById(memberTaskId);
        expect(taskInDb).toBeNull();
    });

    it("success_cascade_delete", async () => {
        // user 1 has successfully deleted parent task
        await request(env.httpServer)
            .delete(`/tasks/${parentTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200);

        // verify parent task is deleted
        const parentInDb = await taskModel.findById(parentTaskId);
        expect(parentInDb).toBeNull();

        // verify sub tasks are also deleted
        const sub1InDb = await taskModel.findById(subtaskIds[0]);
        const sub2InDb = await taskModel.findById(subtaskIds[1]);

        expect(sub1InDb).toBeNull();
        expect(sub2InDb).toBeNull();
    });
});
