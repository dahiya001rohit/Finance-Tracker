const request = require("supertest");
const app = require("../src/app");

async function getToken() {
  const res = await request(app).post("/api/auth/register").send({
    name: "Tx User", email: "txuser@example.com", password: "password123"
  });
  return res.body.token;
}

async function makeCategory(token, name = "Groceries", kind = "expense") {
  const res = await request(app)
    .post("/api/categories")
    .set("Authorization", `Bearer ${token}`)
    .send({ name, kind });
  return res.body.category;
}

describe("Transaction routes", () => {
  let token, category;

  beforeEach(async () => {
    token = await getToken();
    category = await makeCategory(token);
  });

  it("POST /api/transactions — creates an expense", async () => {
    const res = await request(app).post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "expense", amount: 500, currency: "INR", transactionDate: "2025-05-01", categoryId: category.id });
    expect(res.status).toBe(201);
    expect(res.body.transaction.amount).toBe("500.00");
    expect(res.body.transaction.kind).toBe("expense");
  });

  it("POST /api/transactions — rejects negative amount", async () => {
    const res = await request(app).post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "expense", amount: -100, currency: "INR", transactionDate: "2025-05-01" });
    expect(res.status).toBe(400);
  });

  it("POST /api/transactions — accepts positive refund amount", async () => {
    const res = await request(app).post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "refund", amount: 0.01, currency: "INR", transactionDate: "2025-05-01" });
    expect(res.status).toBe(201);
    expect(res.body.transaction.kind).toBe("refund");
  });

  it("POST /api/transactions — rejects wrong category kind", async () => {
    const incomeCat = await makeCategory(token, "Salary", "income");
    const res = await request(app).post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "expense", amount: 100, currency: "INR", transactionDate: "2025-05-01", categoryId: incomeCat.id });
    expect(res.status).toBe(400);
  });

  it("GET /api/transactions — returns transactions for month", async () => {
    await request(app).post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "expense", amount: 200, currency: "INR", transactionDate: "2025-05-15" });
    const res = await request(app).get("/api/transactions?month=2025-05")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.transactions.length).toBeGreaterThan(0);
  });

  it("PUT /api/transactions/:id — updates transaction", async () => {
    const create = await request(app).post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "expense", amount: 100, currency: "INR", transactionDate: "2025-05-01" });
    const id = create.body.transaction.id;
    const res = await request(app).put(`/api/transactions/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "expense", amount: 250, currency: "INR", transactionDate: "2025-05-01", description: "Updated" });
    expect(res.status).toBe(200);
    expect(res.body.transaction.amount).toBe("250.00");
  });

  it("DELETE /api/transactions/:id — deletes transaction", async () => {
    const create = await request(app).post("/api/transactions")
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "expense", amount: 100, currency: "INR", transactionDate: "2025-05-01" });
    const id = create.body.transaction.id;
    const res = await request(app).delete(`/api/transactions/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });

  it("CSV import — imports and deduplicates", async () => {
    const csv = "date,description,amount,currency\n2025-05-01,Rent,10000,INR\n2025-05-01,Rent,10000,INR";
    const buf = Buffer.from(csv);

    const res1 = await request(app).post("/api/transactions/import-csv")
      .set("Authorization", `Bearer ${token}`)
      .attach("statement", buf, { filename: "test.csv", contentType: "text/csv" })
      .field("currency", "INR");
    expect(res1.status).toBe(201);
    expect(res1.body.importedCount).toBe(1);
    expect(res1.body.skippedCount).toBe(1);
  });
});
