// noinspection DuplicatedCode

import request from "supertest";
import { getModelToken } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { Task, TaskDocument } from "../../../src/tasks/schemas/task.schema";
import { TaskResponseDto } from "../../../src/tasks/dto/task.dto";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";
import assert from "node:assert";

describe("TasksController PATCH /tasks/:id", () => {
    let env: TestEnv;
    let projectModel: Model<ProjectDocument>;
    let taskModel: Model<TaskDocument>;

    let targetProjectId: string;
    let alienProjectId: string;

    let targetTaskId: string;
    let alienTaskId: string;

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
            members: [env.user2.userId], // user2 has access
        });
        targetProjectId = project1.id;

        const project3 = await projectModel.create({
            name: "Omega Secret Project",
            ownerId: env.user3.userId,
        });
        alienProjectId = project3.id;

        const task1 = await taskModel.create({
            title: "Initial Target Task",
            description: "To be updated",
            status: "TODO",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
        });
        targetTaskId = task1.id;

        const task3 = await taskModel.create({
            title: "Alien Task",
            projectId: alienProjectId,
            ownerId: env.user3.userId,
        });
        alienTaskId = task3.id;
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .send({ title: "Updated Title" })
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toStrictEqual(["unauthorized"]);
            });
    });

    it("task_not_found_wrong_id", () => {
        const fakeId = new Types.ObjectId().toHexString();
        return request(env.httpServer)
            .patch(`/tasks/${fakeId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "Update" })
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("task_not_found");
            });
    });

    it("access_denied_to_task_project", () => {
        // user 1 trying to update user 3's task
        return request(env.httpServer)
            .patch(`/tasks/${alienTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "Hacked" })
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("project_not_found");
            });
    });

    it("title_empty", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "   " })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("title_empty");
            });
    });

    it("invalid_title", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: true })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_title");
            });
    });

    it("invalid_status", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ status: "UNKNOWN_STATUS" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_status");
            });
    });

    it("invalid_project_id", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ projectId: "not_a_mongo_id" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_project_id");
            });
    });

    it("location.coordinates_must_have_exactly_2_items (1 item)", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ location: { type: "Point", coordinates: [24.0311] } })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("location.coordinates_must_have_exactly_2_items");
            });
    });

    it("location.coordinates_must_have_exactly_2_items (3 items)", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ location: { type: "Point", coordinates: [24.0311, 25.2321, 26.1232] } })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("location.coordinates_must_have_exactly_2_items");
            });
    });

    it("location.coordinates_must_be_numbers", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ location: { type: "Point", coordinates: [true, false] } })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("location.coordinates_must_be_numbers");
            });
    });

    it("location.type_must_be_point", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ location: { type: "Polygon", coordinates: [24.0, 49.0] } })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("location.type_must_be_point");
            });
    });

    it("description_empty", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ description: "   " })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("description_empty");
            });
    });

    it("invalid_description", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ description: true })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_description");
            });
    });

    it("invalid_parent_task_id", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ parentTaskId: "not_a_mongo_id" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_parent_task_id");
            });
    });

    it("invalid_deadline", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ deadline: "invalid_deadline" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_deadline");
            });
    });

    it("tags_must_be_array", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ tags: {} })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("tags_must_be_array");
            });
    });

    it("tag_must_be_string", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ tags: [true] })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("tag_must_be_string");
            });
    });

    it("task_cannot_be_its_own_parent", () => {
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ parentTaskId: targetTaskId }) // sending its own ID!
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("task_cannot_be_its_own_parent");
            });
    });

    it("access_denied_moving_to_another_project", () => {
        // user 1 tries to move the task to a project he doesn't have access to
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ projectId: alienProjectId })
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("project_not_found");
            });
    });

    it("parent_task_not_found", () => {
        const fakeParentId = new Types.ObjectId().toHexString();
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ parentTaskId: fakeParentId })
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("parent_task_not_found");
            });
    });

    it("subtask_must_belong_to_same_project", async () => {
        // user 3 has access to both projects
        await projectModel.findByIdAndUpdate(targetProjectId, { $push: { members: env.user3.userId } });

        // user 3 tries to set parentTaskId from alienProjectId to a task currently in targetProjectId
        return request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user3.accessToken}`)
            .send({ parentTaskId: alienTaskId })
            .expect(403)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("subtask_must_belong_to_same_project");
            });
    });

    it("success_update_status_and_title", async () => {
        const response = await request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`) // member can update
            .send({ title: "Updated by member", status: "IN_PROGRESS" })
            .expect(200);

        const body = response.body as TaskResponseDto;
        // check client response
        expect(body.id).toBe(targetTaskId);
        expect(body.title).toBe("Updated by member");
        expect(body.status).toBe("IN_PROGRESS");
        expect(body.description).toBe("To be updated"); // should remain untouched

        // check db state
        const taskInDb = await taskModel.findById(targetTaskId);
        assert(taskInDb);
        expect(taskInDb.title).toBe("Updated by member");
        expect(taskInDb.status).toBe("IN_PROGRESS");
    });

    it("success_update_moving_to_subtask_and_adding_location", async () => {
        // create a new parent task
        const parentTask = await taskModel.create({
            title: "New Parent Epic",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
        });

        const response = await request(env.httpServer)
            .patch(`/tasks/${targetTaskId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({
                parentTaskId: parentTask.id,
                location: { type: "Point", coordinates: [10.0, 20.0] },
                tags: ["updated", "urgent"],
            })
            .expect(200);

        const body = response.body as TaskResponseDto;
        // check client response
        expect(body.parentTaskId).toBe(parentTask.id);
        expect(body.location?.coordinates).toEqual([10.0, 20.0]);
        expect(body.tags).toStrictEqual(["updated", "urgent"]);

        // check DB
        const taskInDb = await taskModel.findById(targetTaskId);
        assert(taskInDb);
        expect(taskInDb.parentTaskId?.toString()).toBe(parentTask.id);
        expect(taskInDb.tags).toContain("urgent");
    });
});
