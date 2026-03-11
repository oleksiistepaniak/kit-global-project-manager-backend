import request from "supertest";
import { AuthResponse, CoreEnv, ErrorResponse } from "../../types";
import { setupCoreEnv } from "../../test-environment";

describe("AuthController POST /auth/register", () => {
    let env: CoreEnv;

    const testUser = {
        username: "register_tester",
        firstName: "Test",
        lastName: "User",
        email: "register_test@example.com",
        password: "StrongPassword123!",
    };

    beforeAll(async () => {
        env = await setupCoreEnv();
    });

    afterAll(async () => {
        if (env) {
            await env.dbConnection.collection("users").deleteMany({});
            await env.app.close();
        }
    });

    beforeEach(async () => {
        await env.dbConnection.collection("users").deleteMany({});
    });

    it("username_empty", async () => {
        for (const username of ["", "   "]) {
            await request(env.httpServer)
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
            await request(env.httpServer)
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
            await request(env.httpServer)
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
        return request(env.httpServer)
            .post("/auth/register")
            .send({ ...testUser, email: "not-an-email" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["invalid_email"]);
            });
    });

    it("short_password", () => {
        return request(env.httpServer)
            .post("/auth/register")
            .send({ ...testUser, password: "123" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["min_password_length_is_6"]);
            });
    });

    it("empty_body", () => {
        return request(env.httpServer)
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
        return request(env.httpServer)
            .post("/auth/register")
            .send(testUser)
            .expect(201)
            .expect((res) => {
                const body = res.body as AuthResponse;
                expect(body).toHaveProperty("access_token");
                expect(typeof body.access_token).toBe("string");
            });
    });

    it("duplicate_email", async () => {
        await request(env.httpServer).post("/auth/register").send(testUser).expect(201);

        return request(env.httpServer)
            .post("/auth/register")
            .send({ ...testUser, username: "e2e_tester_new" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["duplicated_email_or_username"]);
            });
    });

    it("duplicate_username", async () => {
        await request(env.httpServer).post("/auth/register").send(testUser).expect(201);

        return request(env.httpServer)
            .post("/auth/register")
            .send({ ...testUser, email: "e2e_test_new@example.com" })
            .expect(400)
            .expect((res) => {
                const body = res.body as ErrorResponse;
                expect(body.messages).toEqual(["duplicated_email_or_username"]);
            });
    });
});
