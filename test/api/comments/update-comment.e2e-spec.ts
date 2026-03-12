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

describe("CommentsController PATCH /comments/:id", () => {
    let env: TestEnv;
    let projectModel: Model<ProjectDocument>;
    let taskModel: Model<TaskDocument>;
    let commentModel: Model<CommentDocument>;

    let targetTaskId: string;
    let user1CommentId: string; // comment by the project owner
    let user2CommentId: string; // comment by the project member

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

        // create a shared project
        const project = await projectModel.create({
            name: "Alpha Project",
            ownerId: env.user1.userId,
            members: [env.user2.userId],
        });

        // create a task inside the project
        const task = await taskModel.create({
            title: "Task for comments",
            projectId: project.id,
            ownerId: env.user1.userId,
        });
        targetTaskId = task.id;

        // user 1 creates a comment
        const comment1 = await commentModel.create({
            text: "Initial text by user 1",
            taskId: targetTaskId,
            authorId: env.user1.userId,
        });
        user1CommentId = comment1.id;

        // user 2 creates a comment
        const comment2 = await commentModel.create({
            text: "Initial text by user 2",
            taskId: targetTaskId,
            authorId: env.user2.userId,
        });
        user2CommentId = comment2.id;
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .patch(`/comments/${user1CommentId}`)
            .send({ text: "Updated text" })
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toStrictEqual(["unauthorized"]);
            });
    });

    it("text_empty", () => {
        return request(env.httpServer)
            .patch(`/comments/${user1CommentId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: "   " })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("text_empty");
            });
    });

    it("invalid_text", () => {
        return request(env.httpServer)
            .patch(`/comments/${user1CommentId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: 12345 })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_text");
            });
    });

    it("invalid_comment_id", () => {
        return request(env.httpServer)
            .patch(`/comments/not_a_mongo_id`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: "Updated text" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_id");
            });
    });

    it("comment_not_found_wrong_id", () => {
        const fakeId = new Types.ObjectId().toHexString();
        return request(env.httpServer)
            .patch(`/comments/${fakeId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: "Updated text" })
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("comment_not_found");
            });
    });

    it("forbidden_for_member_to_edit_owners_comment", () => {
        // user 2 tries to edit user 1's comment
        return request(env.httpServer)
            .patch(`/comments/${user1CommentId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .send({ text: "Hacked by user 2!" })
            .expect(403)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("only_author_can_edit_comment");
            });
    });

    it("forbidden_for_owner_to_edit_members_comment", () => {
        // user 1 (project owner) tries to edit user 2's comment
        // even project owners shouldn't be able to edit someone else's words!
        return request(env.httpServer)
            .patch(`/comments/${user2CommentId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: "Corrected by boss!" })
            .expect(403)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("only_author_can_edit_comment");
            });
    });

    it("success_update_own_comment_by_owner", async () => {
        // user 1 updates their own comment
        const response = await request(env.httpServer)
            .patch(`/comments/${user1CommentId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ text: "Successfully updated by user 1" })
            .expect(200);

        const body = response.body as CommentResponseDto;

        // check client response
        expect(body.id).toBe(user1CommentId);
        expect(body.text).toBe("Successfully updated by user 1");

        // check db state
        const commentInDb = await commentModel.findById(user1CommentId);
        assert(commentInDb);
        expect(commentInDb.text).toBe("Successfully updated by user 1");
    });

    it("success_update_own_comment_by_member", async () => {
        // user 2 updates their own comment
        const response = await request(env.httpServer)
            .patch(`/comments/${user2CommentId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .send({ text: "Successfully updated by user 2" })
            .expect(200);

        const body = response.body as CommentResponseDto;

        // check client response
        expect(body.id).toBe(user2CommentId);
        expect(body.text).toBe("Successfully updated by user 2");

        // check db state
        const commentInDb = await commentModel.findById(user2CommentId);
        assert(commentInDb);
        expect(commentInDb.text).toBe("Successfully updated by user 2");
    });
});
