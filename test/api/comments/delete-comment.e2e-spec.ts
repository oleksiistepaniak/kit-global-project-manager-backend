// noinspection DuplicatedCode

import request from "supertest";
import { getModelToken } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { Task, TaskDocument } from "../../../src/tasks/schemas/task.schema";
import { Comment, CommentDocument } from "../../../src/comments/schemas/comment.schema";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";

describe("CommentsController DELETE /comments/:id", () => {
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
            .delete(`/comments/${user1CommentId}`)
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toStrictEqual(["unauthorized"]);
            });
    });

    it("invalid_comment_id", () => {
        return request(env.httpServer)
            .delete(`/comments/not_a_mongo_id`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_id");
            });
    });

    it("comment_not_found_wrong_id", () => {
        const fakeId = new Types.ObjectId().toHexString();
        return request(env.httpServer)
            .delete(`/comments/${fakeId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("comment_not_found");
            });
    });

    it("forbidden_for_member_to_delete_owners_comment", () => {
        // user 2 tries to delete user 1's comment
        return request(env.httpServer)
            .delete(`/comments/${user1CommentId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(403)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("only_author_can_delete_comment");
            });
    });

    it("forbidden_for_owner_to_delete_members_comment", () => {
        // user 1 (project owner) tries to delete user 2's comment
        return request(env.httpServer)
            .delete(`/comments/${user2CommentId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(403)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("only_author_can_delete_comment");
            });
    });

    it("success_delete_own_comment_by_owner", async () => {
        // user 1 deletes their own comment
        await request(env.httpServer)
            .delete(`/comments/${user1CommentId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200);

        // check db state
        const commentInDb = await commentModel.findById(user1CommentId);
        expect(commentInDb).toBeNull();
    });

    it("success_delete_own_comment_by_member", async () => {
        // user 2 deletes their own comment
        await request(env.httpServer)
            .delete(`/comments/${user2CommentId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(200);

        // check db state
        const commentInDb = await commentModel.findById(user2CommentId);
        expect(commentInDb).toBeNull();
    });
});
