import { INestApplication } from "@nestjs/common";
import { Connection } from "mongoose";
import { Server } from "http";

export interface TestUser {
    accessToken: string;
    userId: string;
}

export interface CoreEnv {
    app: INestApplication;
    dbConnection: Connection;
    httpServer: Server;
}

export interface TestEnv extends CoreEnv {
    user1: TestUser;
    user2: TestUser;
    user3: TestUser;
}

export interface ErrorResponse {
    messages: string[];
}

export interface AuthResponse {
    access_token: string;
}
