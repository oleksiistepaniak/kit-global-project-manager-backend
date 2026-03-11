import request from "supertest";
import { ProjectResponseDto } from "../../../src/projects/dto/project.dto";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";

describe("ProjectController PATCH /projects/:id", () => {
    let env: TestEnv;
    let targetProjectId: string;
    let projectModel: Model<ProjectDocument>;

    beforeAll(async () => {
        env = await setupTestEnvironment();
        projectModel = env.app.get<Model<ProjectDocument>>(getModelToken(Project.name));
    });

    afterAll(async () => {
        if (env) {
            await env.dbConnection.collection("users").deleteMany({});
            await projectModel.deleteMany({});
            await env.app.close();
        }
    });

    beforeEach(async () => {
        await projectModel.deleteMany({});

        const project = await projectModel.create({
            name: "Initial Target Project",
            description: "To be updated",
            ownerId: env.user1.userId,
        });

        targetProjectId = project.id;
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .patch(`/projects/${targetProjectId}`)
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["unauthorized"]);
            });
    });

    it("access_denied", async () => {
        return request(env.httpServer)
            .patch(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .send({ description: "Updated description" })
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["project_not_found"]);
            });
    });

    it("project_not_found", async () => {
        const notExistsId = "5f01a0cb4e35982a29087286";
        return request(env.httpServer)
            .patch(`/projects/${notExistsId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ description: "Updated description" })
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["project_not_found"]);
            });
    });

    it("description_empty", async () => {
        return request(env.httpServer)
            .patch(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ description: "  " })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["description_empty"]);
            });
    });

    it("name_empty", async () => {
        return request(env.httpServer)
            .patch(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ name: "  " })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["name_empty"]);
            });
    });

    it("invalid_name", async () => {
        return request(env.httpServer)
            .patch(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ name: true })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["invalid_name"]);
            });
    });

    it("invalid_description", async () => {
        return request(env.httpServer)
            .patch(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ description: true })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["invalid_description"]);
            });
    });

    it("success_update (partial)", () => {
        return request(env.httpServer)
            .patch(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ description: "Updated description" })
            .expect(200)
            .expect((res) => {
                const body = res.body as ProjectResponseDto;
                expect(body.id).toBe(targetProjectId);
                expect(body.name).toBe("Initial Target Project");
                expect(body.description).toBe("Updated description");
            });
    });

    it("success_update (fully)", () => {
        return request(env.httpServer)
            .patch(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ name: "Brand New Name", description: "Brand New Desc" })
            .expect(200)
            .expect((res) => {
                const body = res.body as ProjectResponseDto;
                expect(body.id).toBe(targetProjectId);
                expect(body.name).toBe("Brand New Name");
                expect(body.description).toBe("Brand New Desc");
            });
    });
});
