import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe } from "@nestjs/common";
import { getConnectionToken } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { Server } from "http";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { AuthResponse, CoreEnv, TestEnv, TestUser } from "./types";
import { User } from "../src/auth/schemas/user.schema";
import assert from "node:assert";

export async function setupCoreEnv(): Promise<CoreEnv> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    const dbConnection = app.get<Connection>(getConnectionToken());
    const httpServer = app.getHttpServer() as Server;

    return { app, dbConnection, httpServer };
}

export async function setupTestEnvironment(): Promise<TestEnv> {
    const core = await setupCoreEnv();
    const uniqueSuffix = Date.now().toString();

    const testUser1 = {
        username: `tester1_${uniqueSuffix}`,
        firstName: "Alpha",
        lastName: "User",
        email: `tester1_${uniqueSuffix}@example.com`,
        password: "StrongPassword123!",
    };
    const user1 = await createTestUser(core, testUser1);

    const testUser2 = {
        username: `tester2_${uniqueSuffix}`,
        firstName: "Beta",
        lastName: "User",
        email: `tester2_${uniqueSuffix}@example.com`,
        password: "StrongPassword123!",
    };
    const user2 = await createTestUser(core, testUser2);

    const testUser3 = {
        username: `tester3_${uniqueSuffix}`,
        firstName: "Omega",
        lastName: "User",
        email: `tester3_${uniqueSuffix}@example.com`,
        password: "StrongPassword123!",
    };
    const user3 = await createTestUser(core, testUser3);

    return { ...core, user1, user2, user3 };
}

async function createTestUser(core: CoreEnv, user: User): Promise<TestUser> {
    const authRes = await request(core.httpServer).post("/auth/register").send(user);

    const authBody = authRes.body as AuthResponse;
    const savedUser = await core.dbConnection.collection("users").findOne({ email: user.email });

    assert(savedUser);

    return {
        userId: savedUser._id.toString(),
        accessToken: authBody.access_token,
    };
}
