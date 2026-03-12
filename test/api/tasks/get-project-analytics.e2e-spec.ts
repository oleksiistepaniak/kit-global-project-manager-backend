// noinspection DuplicatedCode

import request from "supertest";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { Task, TaskDocument } from "../../../src/tasks/schemas/task.schema";
import { TaskAnalyticsResponseDto } from "../../../src/tasks/dto/task-analytics.dto";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";

describe("TasksController GET /tasks/project/:projectId/analytics", () => {
    let env: TestEnv;
    let projectModel: Model<ProjectDocument>;
    let taskModel: Model<TaskDocument>;

    let targetProjectId: string;
    let emptyProjectId: string;
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

        // 1. target project with members
        const targetProject = await projectModel.create({
            name: "Analytics Project",
            ownerId: env.user1.userId,
            members: [env.user2.userId],
        });
        targetProjectId = targetProject.id;

        // 2. empty project (to test zero counts)
        const emptyProject = await projectModel.create({
            name: "Empty Project",
            ownerId: env.user1.userId,
        });
        emptyProjectId = emptyProject.id;

        // 3. alien project
        const alienProject = await projectModel.create({
            name: "Alien Project",
            ownerId: env.user3.userId,
        });
        alienProjectId = alienProject.id;

        // 4. seed exact tasks for strict math assertions
        const now = new Date().getTime();
        const pastDeadline = new Date(now - 100000); // overdue
        const futureDeadline = new Date(now + 100000); // not overdue

        // task 1: overdue, TODO
        await taskModel.create({
            title: "Task 1",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
            status: "TODO",
            deadline: pastDeadline,
            tags: ["backend", "urgent"],
        });

        // task 2: not overdue, TODO
        await taskModel.create({
            title: "Task 2",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
            status: "TODO",
            deadline: futureDeadline,
            tags: ["backend", "api"],
        });

        // task 3: overdue, IN_PROGRESS
        await taskModel.create({
            title: "Task 3",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
            status: "IN_PROGRESS",
            deadline: pastDeadline,
            tags: ["backend", "frontend"],
        });

        // task 4: no deadline, IN_PROGRESS
        await taskModel.create({
            title: "Task 4",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
            status: "IN_PROGRESS",
            tags: ["frontend", "urgent"],
        });

        // task 5: past deadline, but DONE (should NOT be counted as overdue!)
        await taskModel.create({
            title: "Task 5",
            projectId: targetProjectId,
            ownerId: env.user1.userId,
            status: "DONE",
            deadline: pastDeadline,
            tags: ["bug", "urgent"],
        });

        // expected math results for targetProjectId:
        // total: 5
        // statuses: TODO(2), IN_PROGRESS(2), DONE(1)
        // overdue: task 1 and task 3 -> total 2
        // tags: backend(3), urgent(3), frontend(2), api(1), bug(1)
    });

    it("unauthorized", () => {
        return request(env.httpServer).get(`/tasks/project/${targetProjectId}/analytics`).expect(401);
    });

    it("invalid_project_id", () => {
        return request(env.httpServer)
            .get(`/tasks/project/not_a_mongo_id/analytics`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_id");
            });
    });

    it("access_denied_to_project", () => {
        // user 1 trying to get analytics for user 3's project
        return request(env.httpServer)
            .get(`/tasks/project/${alienProjectId}/analytics`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(404);
    });

    it("success_analytics_for_empty_project", () => {
        return request(env.httpServer)
            .get(`/tasks/project/${emptyProjectId}/analytics`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as TaskAnalyticsResponseDto;

                // everything should be gracefully handled and return 0 or empty arrays
                expect(body.totalTasks).toBe(0);
                expect(body.overdueTasks).toBe(0);
                expect(body.statusCounts).toEqual([]);
                expect(body.topTags).toEqual([]);
            });
    });

    it("success_accurate_analytics_math", () => {
        // user 2 (member) requests analytics
        return request(env.httpServer)
            .get(`/tasks/project/${targetProjectId}/analytics`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as TaskAnalyticsResponseDto;

                // 1. check total tasks
                expect(body.totalTasks).toBe(5);

                // 2. check overdue tasks (only tasks 1 and 3 are overdue, task 5 is DONE)
                expect(body.overdueTasks).toBe(2);

                // 3. check status counts
                expect(body.statusCounts.length).toBe(3);
                expect(body.statusCounts).toEqual(
                    expect.arrayContaining([
                        { status: "TODO", count: 2 },
                        { status: "IN_PROGRESS", count: 2 },
                        { status: "DONE", count: 1 },
                    ]),
                );

                // 4. check top tags (sorted by count descending)
                expect(body.topTags.length).toBe(5);

                // backend and urgent both have 3, frontend has 2, api and bug have 1
                // we use arrayContaining for the exact counts
                expect(body.topTags).toEqual(
                    expect.arrayContaining([
                        { tag: "backend", count: 3 },
                        { tag: "urgent", count: 3 },
                        { tag: "frontend", count: 2 },
                        { tag: "api", count: 1 },
                        { tag: "bug", count: 1 },
                    ]),
                );

                // ensure sorting works (first items should have count 3)
                expect(body.topTags[0].count).toBe(3);
                expect(body.topTags[body.topTags.length - 1].count).toBe(1);
            });
    });
});
