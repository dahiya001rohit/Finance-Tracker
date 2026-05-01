const request = require("supertest");
const app = require("../src/app");

async function register() {
  const res = await request(app).post("/api/auth/register").send({
    name: "Budget User", email: "budgetuser@example.com", password: "password123"
  });
  return res.body.token;
}

async function makeCategory(token) {
  const res = await request(app).post("/api/categories")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Food", kind: "expense" });
  return res.body.category;
}

describe("Budget routes", () => {
  let token, category;
  const month = "2025-05";

  beforeEach(async () => {
    token = await register();
    category = await makeCategory(token);
  });

  it("POST /api/budgets — creates a budget", async () => {
    const res = await request(app).post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.id, amount: 5000, currency: "INR", month });
    expect(res.status).toBe(201);
    expect(res.body.budget.amount).toBe("5000.00");
  });

  it("POST /api/budgets — upserts existing budget for same category+month", async () => {
    await request(app).post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.id, amount: 3000, currency: "INR", month });
    const res = await request(app).post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.id, amount: 5000, currency: "INR", month });
    expect(res.status).toBe(201);
    expect(res.body.budget.amount).toBe("5000.00");
  });

  it("GET /api/budgets — returns budgets with spent", async () => {
    await request(app).post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.id, amount: 5000, currency: "INR", month });
    await request(app).post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "expense", amount: 2000, currency: "INR", transactionDate: `${month}-10`, categoryId: category.id });
    const res = await request(app).get(`/api/budgets?month=${month}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.budgets[0].spent).toBe("2000.00");
  });

  it("POST /api/budgets/check-overruns — creates notification on overrun", async () => {
    await request(app).post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.id, amount: 100, currency: "INR", month });
    await request(app).post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "expense", amount: 500, currency: "INR", transactionDate: `${month}-01`, categoryId: category.id });
    const res = await request(app).post("/api/budgets/check-overruns")
      .set("Authorization", `Bearer ${token}`)
      .send({ month });
    expect(res.status).toBe(200);
    expect(res.body.overruns.length).toBe(1);
    const notes = await request(app).get("/api/notifications").set("Authorization", `Bearer ${token}`);
    expect(notes.body.notifications.length).toBeGreaterThan(0);
  });

  it("DELETE /api/budgets/:id — deletes budget", async () => {
    const create = await request(app).post("/api/budgets")
      .set("Authorization", `Bearer ${token}`)
      .send({ categoryId: category.id, amount: 1000, currency: "INR", month });
    const id = create.body.budget.id;
    const res = await request(app).delete(`/api/budgets/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });
});
