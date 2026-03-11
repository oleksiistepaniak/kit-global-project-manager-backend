import request from "supertest";
import { AuthResponse, CoreEnv, ErrorResponse } from "../../types";
import { setupCoreEnv } from "../../test-environment";

describe("AuthController POST /auth/login", () => {
    let env: CoreEnv;

    const testUser = {
        username: "login_tester",
        firstName: "Login",
        lastName: "User",
        email: "login_test@example.com",
        password: "StrongPassword123!",
    };

    beforeAll(async () => {
        env = await setupCoreEnv();

        await env.dbConnection.collection("users").deleteMany({});
        await request(env.httpServer).post("/auth/register").send(testUser).expect(201);
    });

    afterAll(async () => {
        if (env) {
            await env.dbConnection.collection("users").deleteMany({});
            await env.app.close();
        }
    });

    it("invalid_email", () => {
        return request(env.httpServer)
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
        return request(env.httpServer)
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
        return request(env.httpServer)
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
        return request(env.httpServer)
            .post("/auth/login")
            .send({
                email: testUser.email,
                password: testUser.password,
            })
            .expect(200)
            .expect((res) => {
                const body = res.body as AuthResponse;
                expect(body).toHaveProperty("access_token");
                expect(typeof body.access_token).toBe("string");
            });
    });

    it("wrong_password", () => {
        return request(env.httpServer)
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
        return request(env.httpServer)
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
