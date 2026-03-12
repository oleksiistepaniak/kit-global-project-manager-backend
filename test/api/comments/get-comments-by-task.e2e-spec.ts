// noinspection DuplicatedCode

import request from "supertest";
import { getModelToken } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { Task, TaskDocument } from "../../../src/tasks/schemas/task.schema";
import { Comment, CommentDocument } from "../../../src/comments/schemas/comment.schema";
import { CommentResponseDto } from "../../../src/comments/dto/comment.dto";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";

describe("CommentsController GET /comments/task/:taskId", () => {
    let env: TestEnv;
    let projectModel: Model<ProjectDocument>;
    let taskModel: Model<TaskDocument>;
    let commentModel: Model<CommentDocument>;

    let targetTaskId: string;
    let emptyTaskId: string;
    let alienTaskId: string;

    let expectedCommentIds: string[] = [];

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
        expectedCommentIds = [];

        // 1. projects
        const targetProject = await projectModel.create({
            name: "Alpha Project",
            ownerId: env.user1.userId,
            members: [env.user2.userId], // user 2 has access
        });

        const alienProject = await projectModel.create({
            name: "Omega Secret Project",
            ownerId: env.user3.userId,
        });

        // 2. tasks
        const targetTask = await taskModel.create({
            title: "Task with comments",
            projectId: targetProject.id,
            ownerId: env.user1.userId,
        });
        targetTaskId = targetTask.id;

        const emptyTask = await taskModel.create({
            title: "Task without comments",
            projectId: targetProject.id,
            ownerId: env.user1.userId,
        });
        emptyTaskId = emptyTask.id;

        const alienTask = await taskModel.create({
            title: "Alien Task",
            projectId: alienProject.id,
            ownerId: env.user3.userId,
        });
        alienTaskId = alienTask.id;

        // 3. comments for target task (with specific dates to test sorting)
        const now = new Date().getTime();

        const commentOldest = await commentModel.create({
            text: "First comment!",
            taskId: targetTaskId,
            authorId: env.user1.userId,
            createdAt: new Date(now - 10000), // 10 seconds ago
        });

        const commentMiddle = await commentModel.create({
            text: "Second comment!",
            taskId: targetTaskId,
            authorId: env.user2.userId,
            createdAt: new Date(now - 5000), // 5 seconds ago
        });

        const commentNewest = await commentModel.create({
            text: "Third comment!",
            taskId: targetTaskId,
            authorId: env.user1.userId,
            createdAt: new Date(now), // just now
        });

        // store in chronological order (asc)
        expectedCommentIds = [commentOldest.id, commentMiddle.id, commentNewest.id];
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .get(`/comments/task/${targetTaskId}`)
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toStrictEqual(["unauthorized"]);
            });
    });

    it("invalid_task_id", () => {
        return request(env.httpServer)
            .get(`/comments/task/not_a_mongo_id`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_id");
            });
    });

    it("task_not_found_wrong_id", () => {
        const fakeId = new Types.ObjectId().toHexString();
        return request(env.httpServer)
            .get(`/comments/task/${fakeId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("task_not_found");
            });
    });

    it("access_denied_to_alien_task", () => {
        // user 1 tries to read comments from user 3's task
        return request(env.httpServer)
            .get(`/comments/task/${alienTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("project_not_found");
            });
    });

    it("success_get_empty_list", () => {
        // user 2 checks a task that has no comments
        return request(env.httpServer)
            .get(`/comments/task/${emptyTaskId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as CommentResponseDto[];
                expect(Array.isArray(body)).toBe(true);
                expect(body.length).toBe(0);
            });
    });

    it("success_get_comments_sorted_by_date_asc", () => {
        // user 2 (member) fetches comments
        return request(env.httpServer)
            .get(`/comments/task/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as CommentResponseDto[];

                expect(Array.isArray(body)).toBe(true);
                expect(body.length).toBe(3);

                // ensure chronological order (oldest first, like a chat history)
                expect(body[0].id).toBe(expectedCommentIds[0]); // oldest
                expect(body[1].id).toBe(expectedCommentIds[1]); // middle
                expect(body[2].id).toBe(expectedCommentIds[2]); // newest

                // verify mapping of task and author ids
                expect(body[0].taskId).toBe(targetTaskId);
                expect(body[0].authorId).toBe(env.user1.userId);
            });
    });
});
