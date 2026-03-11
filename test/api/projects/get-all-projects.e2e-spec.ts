import request from "supertest";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { PaginatedProjectsResponseDto } from "../../../src/projects/dto/paginated-projects.dto";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";

describe("ProjectController GET /projects (Pagination & Filtering)", () => {
    let env: TestEnv;
    let projectModel: Model<ProjectDocument>;
    const generatedProjectsIds: string[] = [];

    beforeAll(async () => {
        env = await setupTestEnvironment();
        projectModel = env.app.get<Model<ProjectDocument>>(getModelToken(Project.name));

        await projectModel.deleteMany({});

        for (let i = 1; i <= 15; i++) {
            const prefix = i % 2 === 0 ? "Kit" : "Global";
            const desc = i % 3 === 0 ? "special desc" : "normal desc";

            const project = await projectModel.create({
                name: `${prefix} Project ${i}`,
                description: desc,
                ownerId: env.user1.userId,
            });

            generatedProjectsIds.push(project.id);
        }

        // creating a project for another user
        await projectModel.create({
            name: "User 2 Secret Project",
            description: "User 2 Secret description",
            ownerId: env.user2.userId,
        });

        // creating a project with members
        await projectModel.create({
            name: "Shared Project For Omega",
            description: "Omega can read this!",
            ownerId: env.user2.userId,
            members: [env.user3.userId], // with members
        });
    });

    afterAll(async () => {
        if (env) {
            await env.dbConnection.collection("users").deleteMany({});
            await projectModel.deleteMany({});
            await env.app.close();
        }
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .get("/projects")
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["unauthorized"]);
            });
    });

    it("invalid_sort_order", () => {
        return request(env.httpServer)
            .get("/projects?sortOrder=random_string")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_sort_order");
            });
    });

    it("invalid_limit", () => {
        return request(env.httpServer)
            .get("/projects?limit=0")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_limit");
            });
    });

    it("invalid_limit (negative)", () => {
        return request(env.httpServer)
            .get("/projects?limit=-10")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_limit");
            });
    });

    it("invalid_limit (not a number)", () => {
        return request(env.httpServer)
            .get("/projects?limit=abc")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toContain("invalid_limit");
            });
    });

    it("success_get_all_with_default_limit", () => {
        return request(env.httpServer)
            .get("/projects")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedProjectsResponseDto;
                // default limit 10
                expect(body.data.length).toEqual(10);
                // by default desc sort, so first element in response should be last created
                expect(body.data[0].id).toEqual(generatedProjectsIds[generatedProjectsIds.length - 1]);
                expect(body.nextCursor).toBe(generatedProjectsIds[5]);
            });
    });

    it("success_get_with_custom_limit_and_cursor", async () => {
        // first 5 projects
        const res1 = await request(env.httpServer)
            .get("/projects?limit=5")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200);

        const body1 = res1.body as PaginatedProjectsResponseDto;
        expect(body1.data.length).toBe(5);
        expect(body1.nextCursor).toBe(generatedProjectsIds[10]);

        // next 5 projects
        const res2 = await request(env.httpServer)
            .get(`/projects?limit=5&cursor=${body1.nextCursor}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200);

        const body2 = res2.body as PaginatedProjectsResponseDto;
        expect(body2.data.length).toBe(5);
        // first element of the 2 page shouldn't be equal to nextCursor of the 1 page
        expect(body2.data[0].id).not.toBe(body1.nextCursor);
    });

    it("success_filter_by_name", () => {
        return request(env.httpServer)
            .get("/projects?name=Kit")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedProjectsResponseDto;
                // Should find (2, 4, 6, 8, 10, 12, 14) -> 7 items
                expect(body.data.length).toBe(7);
                expect(body.data.every((p) => p.name.includes("Kit"))).toBe(true);
            });
    });

    it("success_filter_by_description_case_insensitive", () => {
        return request(env.httpServer)
            .get("/projects?description=SPECIAL") // Testing case-insensitivity
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedProjectsResponseDto;
                // should find (3, 6, 9, 12, 15) -> 5 items
                expect(body.data.length).toBe(5);
            });
    });

    it("success_sort_asc", () => {
        return request(env.httpServer)
            .get("/projects?sortOrder=asc&limit=15")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedProjectsResponseDto;
                expect(body.data.length).toBe(15);
                expect(body.data[0].id).toBe(generatedProjectsIds[0]);
                expect(body.data[14].id).toBe(generatedProjectsIds[14]);
            });
    });

    it("success_get_projects_as_member", () => {
        return request(env.httpServer)
            .get("/projects")
            .set("Authorization", `Bearer ${env.user3.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedProjectsResponseDto;

                // user 3 has only one project as a member
                expect(body.data.length).toBe(1);
                expect(body.data[0].name).toBe("Shared Project For Omega");
            });
    });

    it("success_get_projects_as_owner_with_shared", () => {
        return request(env.httpServer)
            .get("/projects")
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedProjectsResponseDto;

                // user 2 has two projects
                expect(body.data.length).toBe(2);
                expect(body.data[0].name).toBe("Shared Project For Omega");
                expect(body.data[1].name).toBe("User 2 Secret Project");
            });
    });

    it("returns_empty_when_no_match", () => {
        return request(env.httpServer)
            .get("/projects?name=NonExistentProjectName")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as PaginatedProjectsResponseDto;
                expect(body.data.length).toBe(0);
                expect(body.nextCursor).toBeNull();
            });
    });
});
