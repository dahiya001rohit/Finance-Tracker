const request = require("supertest");
const app = require("../src/app");

describe("health endpoint", () => {
  it("returns service health", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body).toMatchObject({
      ok: true,
      service: "personal-finance-tracker"
    });
  });
});
