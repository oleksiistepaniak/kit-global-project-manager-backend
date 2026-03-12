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

describe("TasksController POST /tasks", () => {
    let env: TestEnv;
    let projectModel: Model<ProjectDocument>;
    let taskModel: Model<TaskDocument>;

    let targetProjectId: string;
    let alienProjectId: string;

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
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .post("/tasks")
            .send({ title: "New Task", projectId: targetProjectId })
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toStrictEqual(["unauthorized"]);
            });
    });

    it("title_empty", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "   ", projectId: targetProjectId })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("title_empty");
            });
    });

    it("invalid_title", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: true, projectId: targetProjectId })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_title");
            });
    });

    it("invalid_project_id", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "Task", projectId: "not_a_mongo_id" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_project_id");
            });
    });

    it("location.coordinates_must_have_exactly_2_items (1 item)", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({
                title: "Location Task",
                projectId: targetProjectId,
                location: { type: "Point", coordinates: [24.0311] }, // only one number
            })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("location.coordinates_must_have_exactly_2_items");
            });
    });

    it("location.coordinates_must_have_exactly_2_items (3 items)", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({
                title: "Location Task",
                projectId: targetProjectId,
                location: { type: "Point", coordinates: [24.0311, 24.0562, 25.3422] }, // three numbers
            })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("location.coordinates_must_have_exactly_2_items");
            });
    });

    it("location.coordinates_must_be_numbers", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({
                title: "Location Task",
                projectId: targetProjectId,
                location: { type: "Point", coordinates: [true, false] },
            })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("location.coordinates_must_be_numbers");
            });
    });

    it("location.type_must_be_point", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({
                title: "Location Task",
                projectId: targetProjectId,
                location: { type: "Invalid", coordinates: [24.0311, 25.2322] },
            })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("location.type_must_be_point");
            });
    });

    it("invalid_description", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "Task some", projectId: targetProjectId, description: true })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_description");
            });
    });

    it("description_empty", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "Task some", projectId: targetProjectId, description: "   " })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("description_empty");
            });
    });

    it("invalid_parent_task_id", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "Task some", projectId: targetProjectId, parentTaskId: "not_a_mongo_id" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_parent_task_id");
            });
    });

    it("invalid_deadline", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "Task some", projectId: targetProjectId, deadline: "invalid_deadline" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_deadline");
            });
    });

    it("tags_must_be_array", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "Task some", projectId: targetProjectId, tags: {} })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("tags_must_be_array");
            });
    });

    it("tag_must_be_string", () => {
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "Task some", projectId: targetProjectId, tags: [true] })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("tag_must_be_string");
            });
    });

    it("access_denied_to_project", () => {
        // user 1 is trying to create a task in the project of user 3
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "Hack Task", projectId: alienProjectId })
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("project_not_found");
            });
    });

    it("parent_task_not_found", () => {
        const fakeId = new Types.ObjectId().toHexString();
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ title: "Task some", projectId: targetProjectId, parentTaskId: fakeId })
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("parent_task_not_found");
            });
    });

    it("subtask_must_belong_to_same_project", async () => {
        const alienTask = await taskModel.create({
            title: "Alien Task in Project 3",
            projectId: alienProjectId,
            ownerId: env.user3.userId,
        });

        // user 3 has access to two projects
        await projectModel.findByIdAndUpdate(targetProjectId, { $push: { members: env.user3.userId } });

        // user 3 wants to create a task in targetProject id, but parent task is from another project
        return request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user3.accessToken}`)
            .send({
                title: "Malicious Cross-Project Subtask",
                projectId: targetProjectId,
                parentTaskId: alienTask.id,
            })
            .expect(403)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("subtask_must_belong_to_same_project");
            });
    });

    it("success_creation_full_with_location_by_member", async () => {
        const response = await request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .send({
                title: "Awesome Task",
                description: "With GeoJSON",
                projectId: targetProjectId,
                tags: ["nestjs", "e2e"],
                location: { type: "Point", coordinates: [24.0311, 49.8397] },
            })
            .expect(201);

        const body = response.body as TaskResponseDto;

        // check client response
        expect(body).toHaveProperty("id");
        expect(body.title).toBe("Awesome Task");
        expect(body.status).toBe("TODO"); // default status
        expect(body.projectId).toBe(targetProjectId);
        expect(body.ownerId).toBe(env.user2.userId);
        expect(body.parentTaskId).toBeNull(); // it's not a subtask

        expect(body.location).toBeDefined();
        expect(body.location?.type).toBe("Point");
        expect(body.location?.coordinates).toEqual([24.0311, 49.8397]);

        // check db state
        const taskInDb = await taskModel.findById(body.id);
        assert(taskInDb);
        expect(taskInDb.title).toBe("Awesome Task");
        expect(taskInDb.location?.coordinates[0]).toBe(24.0311);
    });

    it("success_creation_subtask", async () => {
        // create a parent task
        const parentTask = await taskModel.create({
            title: "Parent Epic",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
        });

        // create a subtask
        const response = await request(env.httpServer)
            .post("/tasks")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({
                title: "Child Subtask",
                projectId: targetProjectId,
                parentTaskId: parentTask.id, // it's a subtask
            })
            .expect(201);

        const body = response.body as TaskResponseDto;

        // check client response
        expect(body.title).toBe("Child Subtask");
        expect(body.parentTaskId).toBe(parentTask.id);

        // check db state
        const subtaskInDb = await taskModel.findById(body.id);
        assert(subtaskInDb);
        expect(subtaskInDb.parentTaskId?.toString()).toBe(parentTask.id);
    });
});
