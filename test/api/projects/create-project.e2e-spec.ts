import request from "supertest";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { ProjectResponseDto } from "../../../src/projects/dto/project.dto";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";
import assert from "node:assert";

describe("ProjectController POST /projects", () => {
    let env: TestEnv;
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
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .post("/projects")
            .send({ name: "Test Project" })
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["unauthorized"]);
            });
    });

    it("name_empty", () => {
        return request(env.httpServer)
            .post("/projects")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ name: "   " })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["name_empty"]);
            });
    });

    it("invalid_name", () => {
        return request(env.httpServer)
            .post("/projects")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ name: true })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["invalid_name"]);
            });
    });

    it("description_empty", () => {
        return request(env.httpServer)
            .post("/projects")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ name: "Project name", description: "   " })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["description_empty"]);
            });
    });

    it("invalid_description", () => {
        return request(env.httpServer)
            .post("/projects")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ name: "Project name", description: true })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["invalid_description"]);
            });
    });

    it("success_creation", async () => {
        const response = await request(env.httpServer)
            .post("/projects")
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .send({ name: "Kit Global API", description: "First test project" })
            .expect(201);

        const body = response.body as ProjectResponseDto;

        // check client response
        expect(body).toHaveProperty("id");
        expect(body.name).toBe("Kit Global API");
        expect(body.description).toBe("First test project");
        expect(body).not.toHaveProperty("ownerId"); // without this field in DTO

        // check db state
        const projectInDb = await projectModel.findById(body.id);
        assert(projectInDb);
        expect(projectInDb).not.toBeNull();
        expect(projectInDb.name).toBe("Kit Global API");
        expect(projectInDb.ownerId.toString()).toBe(env.user1.userId); // check owner id
    });
});
