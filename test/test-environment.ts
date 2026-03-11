import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe } from "@nestjs/common";
import { getConnectionToken } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { Server } from "http";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { AuthResponse, CoreEnv, TestEnv } from "./types";

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
    const authRes1 = await request(core.httpServer).post("/auth/register").send(testUser1);

    const authBody1 = authRes1.body as AuthResponse;
    const savedUser1 = await core.dbConnection.collection("users").findOne({ email: testUser1.email });

    const testUser2 = {
        username: `tester2_${uniqueSuffix}`,
        firstName: "Beta",
        lastName: "User",
        email: `tester2_${uniqueSuffix}@example.com`,
        password: "StrongPassword123!",
    };
    const authRes2 = await request(core.httpServer).post("/auth/register").send(testUser2);

    const authBody2 = authRes2.body as AuthResponse;
    const savedUser2 = await core.dbConnection.collection("users").findOne({ email: testUser2.email });

    return {
        ...core,
        user1: { accessToken: authBody1.access_token, userId: savedUser1!._id.toString() },
        user2: { accessToken: authBody2.access_token, userId: savedUser2!._id.toString() },
    };
}
