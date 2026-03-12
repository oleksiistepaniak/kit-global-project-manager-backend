// noinspection DuplicatedCode

import request from "supertest";
import { Types, Model } from "mongoose";
import { getModelToken } from "@nestjs/mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { Task, TaskDocument } from "../../../src/tasks/schemas/task.schema";
import { Comment, CommentDocument } from "../../../src/comments/schemas/comment.schema";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";

describe("ProjectController DELETE /projects/:id", () => {
    let env: TestEnv;
    let projectModel: Model<ProjectDocument>;
    let taskModel: Model<TaskDocument>;
    let commentModel: Model<CommentDocument>;

    let targetProjectId: string;
    let taskId: string;
    let commentId: string;

    beforeAll(async () => {
        env = await setupTestEnvironment();
        projectModel = env.app.get<Model<ProjectDocument>>(getModelToken(Project.name));
        taskModel = env.app.get<Model<TaskDocument>>(getModelToken(Task.name));
        commentModel = env.app.get<Model<CommentDocument>>(getModelToken(Comment.name));
    });

    afterAll(async () => {
        if (env) {
            await env.dbConnection.collection("users").deleteMany({});
            await projectModel.deleteMany({});
            await taskModel.deleteMany({});
            await commentModel.deleteMany({});
            await env.app.close();
        }
    });

    beforeEach(async () => {
        await projectModel.deleteMany({});
        await taskModel.deleteMany({});
        await commentModel.deleteMany({});

        const project = await projectModel.create({
            name: "Project to Delete",
            description: "Will be destroyed soon",
            ownerId: env.user1.userId,
        });
        targetProjectId = project.id;

        const task = await taskModel.create({
            title: "Task that will die with project",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
        });
        taskId = task.id;

        const comment = await commentModel.create({
            text: "I will vanish too",
            taskId: taskId,
            authorId: env.user1.userId,
        });
        commentId = comment.id;
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .delete(`/projects/${targetProjectId}`)
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["unauthorized"]);
            });
    });

    it("access_denied_for_another_user", () => {
        return request(env.httpServer)
            .delete(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["project_not_found"]);
            });
    });

    it("not_found_wrong_id", () => {
        const fakeId = new Types.ObjectId().toHexString();
        return request(env.httpServer)
            .delete(`/projects/${fakeId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["project_not_found"]);
            });
    });

    it("forbidden_for_member", async () => {
        await projectModel.findByIdAndUpdate(targetProjectId, { members: [env.user2.userId] });

        return request(env.httpServer)
            .delete(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(403)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["only_owner_can_delete_project"]);
            });
    });

    it("access_denied_for_outsider", () => {
        return request(env.httpServer)
            .delete(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user3.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["project_not_found"]);
            });
    });

    it("success_cascade_delete_project_tasks_and_comments", async () => {
        await request(env.httpServer)
            .delete(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body).toEqual({});
            });

        const projectInDb = await projectModel.findById(targetProjectId);
        expect(projectInDb).toBeNull();

        const taskInDb = await taskModel.findById(taskId);
        expect(taskInDb).toBeNull();

        const commentInDb = await commentModel.findById(commentId);
        expect(commentInDb).toBeNull();
    });
});
