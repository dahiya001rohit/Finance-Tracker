const request = require("supertest");
const app = require("../src/app");

describe("Auth routes", () => {
  const user = { name: "Test User", email: "test@example.com", password: "password123", preferredCurrency: "INR" };

  it("POST /api/auth/register — creates a user and returns token", async () => {
    const res = await request(app).post("/api/auth/register").send(user);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(user.email);
  });

  it("POST /api/auth/register — rejects duplicate email", async () => {
    await request(app).post("/api/auth/register").send(user);
    const res = await request(app).post("/api/auth/register").send(user);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it("POST /api/auth/register — rejects short password", async () => {
    const res = await request(app).post("/api/auth/register").send({ ...user, password: "short" });
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/login — returns token for valid credentials", async () => {
    await request(app).post("/api/auth/register").send(user);
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("POST /api/auth/login — rejects wrong password", async () => {
    await request(app).post("/api/auth/register").send(user);
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me — returns user for valid token", async () => {
    const reg = await request(app).post("/api/auth/register").send(user);
    const { token } = reg.body;
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it("GET /api/auth/me — rejects missing token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
