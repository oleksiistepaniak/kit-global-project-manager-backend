import request from "supertest";
import { Types, Model } from "mongoose";
import { getModelToken } from "@nestjs/mongoose";
import { Project, ProjectDocument } from "../../../src/projects/schemas/project.schema";
import { ProjectResponseDto } from "../../../src/projects/dto/project.dto";
import { setupTestEnvironment } from "../../test-environment";
import { ErrorResponse, TestEnv } from "../../types";

describe("ProjectController GET /projects/:id", () => {
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
            name: "Kit Global API",
            description: "First test project",
            ownerId: env.user1.userId,
        });

        targetProjectId = project.id;
    });

    it("unauthorized", () => {
        return request(env.httpServer)
            .get(`/projects/${targetProjectId}`)
            .expect(401)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["unauthorized"]);
            });
    });

    it("access_denied_for_another_user", () => {
        return request(env.httpServer)
            .get(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user2.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["project_not_found"]);
            });
    });

    it("not_found_wrong_id", () => {
        const fakeId = new Types.ObjectId().toHexString();
        return request(env.httpServer)
            .get(`/projects/${fakeId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(404)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["project_not_found"]);
            });
    });

    it("success_get_one", () => {
        return request(env.httpServer)
            .get(`/projects/${targetProjectId}`)
            .set("Authorization", `Bearer ${env.user1.accessToken}`)
            .expect(200)
            .expect((res) => {
                const body = res.body as ProjectResponseDto;
                expect(body.id).toBe(targetProjectId);
                expect(body.name).toBe("Kit Global API");
                expect(body.description).toBe("First test project");
            });
    });
});
