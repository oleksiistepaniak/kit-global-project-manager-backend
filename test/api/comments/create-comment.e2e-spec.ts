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
import assert from "node:assert";

describe("CommentsController POST /comments", () => {
    let env: TestEnv;
    let projectModel: Model<ProjectDocument>;
    let taskModel: Model<TaskDocument>;
    let commentModel: Model<CommentDocument>;

    let targetTaskId: string;
    let alienTaskId: string;

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

        // 1. target project (user1 is owner, user2 is member)
        const targetProject = await projectModel.create({
            name: "Alpha Project",
            ownerId: env.user1.userId,
            members: [env.user2.userId],
        });

        // 2. alien project (user3 is owner)
        const alienProject = await projectModel.create({
            name: "Omega Secret Project",
            ownerId: env.user3.userId,
        });

        // 3. tasks
        const targetTask = await taskModel.create({
            title: "Task for comments",
            projectId: targetProject.id,
            ownerId: env.user1.userId,
        });
        targetTaskId = targetTask.id;

        const alienTask = await taskModel.create({
            title: "Alien Task",
            projectId: alienProject.id,
            ownerId: env.user3.userId,
        });
        alienTaskId = alienTask.id;
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .post("/comments")
            .send({ text: "Hello", taskId: targetTaskId })
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toStrictEqual(["unauthorized"]);
            });
    });

    it("text_empty", () => {
        return request(env.httpServer)
            .post("/comments")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: "   ", taskId: targetTaskId })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("text_empty");
            });
    });

    it("invalid_text", () => {
        return request(env.httpServer)
            .post("/comments")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: 12345, taskId: targetTaskId })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_text");
            });
    });

    it("task_id_empty", () => {
        return request(env.httpServer)
            .post("/comments")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: "Nice task!" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("task_id_empty");
            });
    });

    it("invalid_task_id", () => {
        return request(env.httpServer)
            .post("/comments")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: "Nice task!", taskId: "not_a_mongo_id" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_task_id");
            });
    });

    it("task_not_found_wrong_id", () => {
        const fakeId = new Types.ObjectId().toHexString();
        return request(env.httpServer)
            .post("/comments")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: "Hello", taskId: fakeId })
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("task_not_found");
            });
    });

    it("access_denied_to_task_project", () => {
        // user 1 tries to comment on user 3's task
        return request(env.httpServer)
            .post("/comments")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: "Hacking your task!", taskId: alienTaskId })
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("project_not_found");
            });
    });

    it("success_creation_by_project_owner", async () => {
        // user 1 (owner) comments on his own project's task
        const response = await request(env.httpServer)
            .post("/comments")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({
                text: "I am the boss here.",
                taskId: targetTaskId,
            })
            .expect(201);

        const body = response.body as CommentResponseDto;

        // check client response
        expect(body).toHaveProperty("id");
        expect(body.text).toBe("I am the boss here.");
        expect(body.taskId).toBe(targetTaskId);
        expect(body.authorId).toBe(env.user1.userId);
        expect(body).toHaveProperty("createdAt");

        // check db state
        const commentInDb = await commentModel.findById(body.id);
        assert(commentInDb);
        expect(commentInDb.text).toBe("I am the boss here.");
        expect(commentInDb.authorId.toString()).toBe(env.user1.userId);
    });

    it("success_creation_by_project_member", async () => {
        // user 2 (member) comments on the task
        const response = await request(env.httpServer)
            .post("/comments")
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .send({
                text: "I will do this task today!",
                taskId: targetTaskId,
            })
            .expect(201);

        const body = response.body as CommentResponseDto;

        // check client response
        expect(body.text).toBe("I will do this task today!");
        expect(body.authorId).toBe(env.user2.userId);

        // check db state
        const commentInDb = await commentModel.findById(body.id);
        assert(commentInDb);
        expect(commentInDb.authorId.toString()).toBe(env.user2.userId);
    });
});
