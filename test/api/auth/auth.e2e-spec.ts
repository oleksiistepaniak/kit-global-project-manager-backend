import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { getConnectionToken } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { Server } from "http";
import { AppModule } from "../../../src/app.module";
import { HttpExceptionFilter } from "../../../src/common/filters/http-exception.filter";

interface ErrorResponse {
    messages: string[];
}

interface AuthResponse {
    access_token: string;
}

describe("AuthController_e2e_tests", () => {
    let app: INestApplication;
    let dbConnection: Connection;
    let httpServer: Server;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                transform: true,
            }),
        );

        app.useGlobalFilters(new HttpExceptionFilter());

        await app.init();
        dbConnection = app.get(getConnectionToken());

        httpServer = app.getHttpServer() as Server;
    });

    afterAll(async () => {
        if (dbConnection) {
            await dbConnection.collection("users").deleteMany({});
            await dbConnection.close();
        }
        await app.close();
    });

    const testUser = {
        username: "e2e_tester",
        firstName: "Test",
        lastName: "User",
        email: "e2e_test@example.com",
        password: "StrongPassword123!",
    };

    describe("/auth/register (POST)", () => {
        it("username_empty", async () => {
            for (const username of ["", "   "]) {
                await request(httpServer)
                    .post("/auth/register")
                    .send({ ...testUser, username })
                    .expect(400)
                    .expect((res) => {
                        const body = res.body as ErrorResponse;
                        expect(body.messages).toEqual(["username_empty"]);
                    });
            }
        });

        it("first_name_empty", async () => {
            for (const firstName of ["", "   "]) {
                await request(httpServer)
                    .post("/auth/register")
                    .send({ ...testUser, firstName })
                    .expect(400)
                    .expect((res) => {
                        const body = res.body as ErrorResponse;
                        expect(body.messages).toEqual(["first_name_empty"]);
                    });
            }
        });

        it("last_name_empty", async () => {
            for (const lastName of ["", "   "]) {
                await request(httpServer)
                    .post("/auth/register")
                    .send({ ...testUser, lastName })
                    .expect(400)
                    .expect((res) => {
                        const body = res.body as ErrorResponse;
                        expect(body.messages).toEqual(["last_name_empty"]);
                    });
            }
        });

        it("invalid_email", () => {
            return request(httpServer)
                .post("/auth/register")
                .send({ ...testUser, email: "not-an-email" })
                .expect(400)
                .expect((res) => {
                    const body = res.body as ErrorResponse;
                    expect(body.messages).toEqual(["invalid_email"]);
                });
        });

        it("short_password", () => {
            return request(httpServer)
                .post("/auth/register")
                .send({ ...testUser, password: "123" })
                .expect(400)
                .expect((res) => {
                    const body = res.body as ErrorResponse;
                    expect(body.messages).toEqual(["min_password_length_is_6"]);
                });
        });

        it("empty_body", () => {
            return request(httpServer)
                .post("/auth/register")
                .send({})
                .expect(400)
                .expect((res) => {
                    const body = res.body as ErrorResponse;
                    expect(body.messages).toContain("username_empty");
                    expect(body.messages).toContain("first_name_empty");
                    expect(body.messages).toContain("last_name_empty");
                    expect(body.messages).toContain("invalid_email");
                    expect(body.messages).toContain("invalid_password");
                });
        });

        it("success", () => {
            return request(httpServer)
                .post("/auth/register")
                .send(testUser)
                .expect(201)
                .expect((res) => {
                    const body = res.body as AuthResponse;
                    expect(body).toHaveProperty("access_token");
                    expect(typeof body.access_token).toBe("string");
                });
        });

        it("duplicate_email", () => {
            return request(httpServer)
                .post("/auth/register")
                .send({ ...testUser, username: "e2e_tester_new" })
                .expect(400)
                .expect((res) => {
                    const body = res.body as ErrorResponse;
                    expect(body.messages).toEqual(["duplicated_email_or_username"]);
                });
        });

        it("duplicate_username", () => {
            return request(httpServer)
                .post("/auth/register")
                .send({ ...testUser, email: "e2e_test_new@example.com" })
                .expect(400)
                .expect((res) => {
                    const body = res.body as ErrorResponse;
                    expect(body.messages).toEqual(["duplicated_email_or_username"]);
                });
        });
    });

    describe("/auth/login (POST)", () => {
        it("invalid_email", () => {
            return request(httpServer)
                .post("/auth/login")
                .send({
                    email: "",
                    password: testUser.password,
                })
                .expect(400)
                .expect((res) => {
                    const body = res.body as ErrorResponse;
                    expect(body.messages).toEqual(["invalid_email"]);
                });
        });

        it("password_empty", () => {
            return request(httpServer)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: "",
                })
                .expect(400)
                .expect((res) => {
                    const body = res.body as ErrorResponse;
                    expect(body.messages).toEqual(["password_empty"]);
                });
        });

        it("invalid_password", () => {
            return request(httpServer)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: true,
                })
                .expect(400)
                .expect((res) => {
                    const body = res.body as ErrorResponse;
                    expect(body.messages).toEqual(["invalid_password"]);
                });
        });

        it("success", () => {
            return request(httpServer)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password,
                })
                .expect(200)
                .expect((res) => {
                    const body = res.body as AuthResponse;
                    expect(body).toHaveProperty("access_token");
                });
        });

        it("wrong_password", () => {
            return request(httpServer)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: "WrongPassword123!",
                })
                .expect(401)
                .expect((res) => {
                    const body = res.body as ErrorResponse;
                    expect(body.messages).toEqual(["wrong_password_or_email"]);
                });
        });

        it("user_not_found", () => {
            return request(httpServer)
                .post("/auth/login")
                .send({
                    email: "not_found@example.com",
                    password: "Password123!",
                })
                .expect(401)
                .expect((res) => {
                    const body = res.body as ErrorResponse;
                    expect(body.messages).toEqual(["wrong_password_or_email"]);
                });
        });
    });
});
