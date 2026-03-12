// noinspection DuplicatedCode

import request from "supertest";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { Task, TaskDocument } from "../../../src/tasks/schemas/task.schema";
import { PaginatedTasksResponseDto } from "../../../src/tasks/dto/paginated-tasks.dto";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";

describe("TasksController GET /tasks/project/:projectId (Filters, Sort, Paginate, GEO)", () => {
    let env: TestEnv;
    let projectModel: Model<ProjectDocument>;
    let taskModel: Model<TaskDocument>;

    let targetProjectId: string;
    let alienProjectId: string;

    let generatedTaskIds: string[] = [];

    const LVIV = [24.0311, 49.8397];
    const KYIV = [30.5234, 50.4501];
    const WARSAW = [21.0122, 52.2297];

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
        generatedTaskIds = [];

        // projects
        const project1 = await projectModel.create({
            name: "Mega Project",
            ownerId: env.user1.userId,
            members: [env.user2.userId],
        });
        targetProjectId = project1.id;

        const project3 = await projectModel.create({
            name: "Alien Project",
            ownerId: env.user3.userId,
        });
        alienProjectId = project3.id;

        // generate 15 tasks with diff params
        const now = new Date().getTime();

        for (let i = 1; i <= 15; i++) {
            const status = i % 3 === 0 ? "DONE" : i % 2 === 0 ? "IN_PROGRESS" : "TODO";
            const tags = i % 2 === 0 ? ["backend", "urgent"] : ["frontend"];
            let coords: number[];
            if (i <= 5) {
                const offset = (i - 1) * 0.001;
                coords = [LVIV[0], LVIV[1] + offset];
            } else if (i <= 10) {
                coords = KYIV;
            } else {
                coords = WARSAW;
            }

            const deadline = new Date(now + i * 100000);

            // task 13 and 14 have the same deadline
            const finalDeadline = i === 14 ? new Date(now + 13 * 100000) : deadline;

            const task = await taskModel.create({
                title: `Task number ${i}`,
                description: `Description with keyword ALFA-${i}`,
                status,
                tags,
                projectId: targetProjectId,
                ownerId: env.user1.userId,
                createdAt: new Date(now - i * 1000), // task 1 is newest, task 15 is oldest
                deadline: finalDeadline,
                location: { type: "Point", coordinates: coords },
            } as any);

            generatedTaskIds.push(task.id);
        }

        // task in another project
        await taskModel.create({
            title: "Secret Alien Task",
            projectId: alienProjectId,
            ownerId: env.user3.userId,
        });
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}`)
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toStrictEqual(["unauthorized"]);
            });
    });

    it("access_denied_to_project", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${alienProjectId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toStrictEqual(["project_not_found"]);
            });
    });

    it("invalid_limit", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?limit=0`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("min_limit_is_1");
            });
    });

    it("invalid_limit_max", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?limit=101`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("max_limit_is_100");
            });
    });

    it("invalid_sort_by", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?sortBy=invalidField`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_sort_by");
            });
    });

    it("invalid_sort_order", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?sortOrder=random`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_sort_order");
            });
    });

    it("success_get_all_with_default_params_desc", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedTasksResponseDto;

                // default limit - 10
                expect(body.data.length).toEqual(10);

                // by default sortBy=createdAt, sortOrder=desc (newest is first)
                // task 1 the newest, task 15 - the oldest.
                expect(body.data[0].id).toEqual(generatedTaskIds[0]);
                expect(body.data[9].id).toEqual(generatedTaskIds[9]);

                // check cursor
                expect(body.nextCursor).toBe(generatedTaskIds[9]);
            });
    });

    it("success_get_with_custom_limit_and_cursor_asc", async () => {
        // page 1
        const res1 = await request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?limit=5&sortOrder=asc`) // the oldest is first (task 15 -> task 1)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200);

        const body1 = res1.body as PaginatedTasksResponseDto;
        expect(body1.data.length).toBe(5);
        expect(body1.data[0].id).toBe(generatedTaskIds[14]); // task 15
        expect(body1.data[4].id).toBe(generatedTaskIds[10]); // task 11
        expect(body1.nextCursor).toBe(generatedTaskIds[10]);

        // page 2
        const res2 = await request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?limit=5&sortOrder=asc&cursor=${body1.nextCursor}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200);

        const body2 = res2.body as PaginatedTasksResponseDto;
        expect(body2.data.length).toBe(5);
        expect(body2.data[0].id).toBe(generatedTaskIds[9]); // Task 10
        expect(body2.data[4].id).toBe(generatedTaskIds[5]); // task 6
        expect(body2.data[0].id).not.toBe(body1.nextCursor);
    });

    it("success_sort_by_deadline", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?sortBy=deadline&sortOrder=asc&limit=15`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedTasksResponseDto;
                expect(body.data.length).toBe(15);

                // task 1 has the earliest deadline
                expect(body.data[0].id).toBe(generatedTaskIds[0]);
                expect(body.data[14].id).toBe(generatedTaskIds[14]);
            });
    });

    it("success_filter_by_search_text", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?search=ALFA-3`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedTasksResponseDto;
                expect(body.data.length).toBe(1);
                expect(body.data[0].description).toContain("ALFA-3");
            });
    });

    it("success_filter_by_single_status", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?status=DONE&limit=15`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedTasksResponseDto;
                // tasks 3, 6, 9, 12, 15
                expect(body.data.length).toBe(5);
                expect(body.data.every((t) => t.status === "DONE")).toBe(true);
                const ids = body.data.map((d) => d.id);
                const expectedIds = [
                    generatedTaskIds[2],
                    generatedTaskIds[5],
                    generatedTaskIds[8],
                    generatedTaskIds[11],
                    generatedTaskIds[14],
                ];
                expect(ids).toStrictEqual(expectedIds);
            });
    });

    it("success_filter_by_multiple_statuses", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?status=DONE&status=TODO&limit=15`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedTasksResponseDto;
                expect(body.data.length).toBe(10);
                expect(body.data.every((t) => t.status === "DONE" || t.status === "TODO")).toBe(true);
                const ids = body.data.map((d) => d.id);
                const expectedIds = [
                    generatedTaskIds[0],
                    generatedTaskIds[2],
                    generatedTaskIds[4],
                    generatedTaskIds[5],
                    generatedTaskIds[6],
                    generatedTaskIds[8],
                    generatedTaskIds[10],
                    generatedTaskIds[11],
                    generatedTaskIds[12],
                    generatedTaskIds[14],
                ];
                expect(ids).toStrictEqual(expectedIds);
            });
    });

    it("success_filter_by_tags", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?tags=urgent&limit=15`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedTasksResponseDto;
                expect(body.data.length).toBe(7);
                expect(body.data.every((t) => t.tags.includes("urgent"))).toBe(true);
                const ids = body.data.map((d) => d.id);
                const expectedIds = [
                    generatedTaskIds[1],
                    generatedTaskIds[3],
                    generatedTaskIds[5],
                    generatedTaskIds[7],
                    generatedTaskIds[9],
                    generatedTaskIds[11],
                    generatedTaskIds[13],
                ];
                expect(ids).toStrictEqual(expectedIds);
            });
    });

    it("success_geo_search_near_lviv", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?lat=${LVIV[1]}&lng=${LVIV[0]}&radius=5000`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`) // member test
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedTasksResponseDto;

                // should find 5 tasks
                expect(body.data.length).toBe(5);

                // check that Lviv coords are returned
                expect(body.data.every((t) => t.location?.coordinates[0] === LVIV[0])).toBe(true);
            });
    });

    it("success_geo_search_empty_result_due_to_small_radius", () => {
        const offsetLat = LVIV[1] + 0.1;

        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?lat=${offsetLat}&lng=${LVIV[0]}&radius=100`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedTasksResponseDto;
                // radius is too small
                expect(body.data.length).toBe(0);
                expect(body.nextCursor).toBeNull();
            });
    });

    it("success_geo_search_within_radius_with_offset_coordinates", () => {
        // exact coordinates of Lviv tasks start at: [24.0311, 49.8397] (lng, lat)
        // shift the latitude by 0.01 degrees (which is approximately 1.1 kilometers to the north)
        const searchLat = LVIV[1] + 0.01; // 49.8497
        const searchLng = LVIV[0]; // 24.0311

        // set the radius to 2000 meters (2 km)
        // since the distance to the tasks is ~1.1 km, they must be included in the response!
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?lat=${searchLat}&lng=${searchLng}&radius=2000`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedTasksResponseDto;

                // should find our 5 Lviv tasks
                expect(body.data.length).toBe(5);

                // extract IDs of the returned tasks
                const returnedIds = body.data.map((t) => t.id);

                // the 5 Lviv tasks are exactly the first 5 generated tasks (indexes 0 to 4)
                const expectedLvivIds = generatedTaskIds.slice(0, 5);

                // ensure that the returned tasks exactly match our Lviv tasks (ignoring the specific order)
                expect(returnedIds).toEqual(expect.arrayContaining(expectedLvivIds));
            });
    });

    it("success_geo_search_is_sorted_by_distance_automatically", () => {
        // we are searching exactly in the center of Lviv (coordinates of task 1)
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?lat=${LVIV[1]}&lng=${LVIV[0]}&radius=5000`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedTasksResponseDto;

                expect(body.data.length).toBe(5);

                // since MongoDB automatically sorts $near from nearest to farthest:
                // task 1 should be the nearest (distance 0)
                // task 5 should be the farthest

                // check the order (first element)
                expect(body.data[0].id).toBe(generatedTaskIds[0]); // task 1

                // check the order (last element)
                expect(body.data[4].id).toBe(generatedTaskIds[4]); // task 5

                // we can also check the entire array order
                const returnedIds = body.data.map((t) => t.id);
                const expectedOrder = [
                    generatedTaskIds[0], // task 1 (center)
                    generatedTaskIds[1], // task 2 (+0.001)
                    generatedTaskIds[2], // task 3 (+0.002)
                    generatedTaskIds[3], // task 4 (+0.003)
                    generatedTaskIds[4], // task 5 (+0.004)
                ];

                expect(returnedIds).toStrictEqual(expectedOrder);
            });
    });

    it("returns_empty_when_no_match", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}?search=GhostTask`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedTasksResponseDto;
                expect(body.data.length).toBe(0);
                expect(body.nextCursor).toBeNull();
            });
    });
});
