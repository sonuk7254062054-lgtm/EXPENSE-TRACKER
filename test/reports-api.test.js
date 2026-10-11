import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/user.js";
import { Transaction } from "../src/models/transaction.js";

const databaseName = `expense_reports_test_${process.pid}_${Date.now()}`;
const sessionSecret = "test-session-secret-that-is-over-32-characters";
let app;
let sessionStore;

before(async () => {
  await mongoose.connect(`mongodb://127.0.0.1:27017/${databaseName}`, {
    serverSelectionTimeoutMS: 5000,
  });
  await Promise.all([User.init(), Transaction.init()]);
  sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: "report_test_sessions",
  });
  app = createApp({ sessionSecret, sessionStore });
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await sessionStore.close();
    await mongoose.disconnect();
  }
});

async function makeAuthenticatedUser(email) {
  const agent = request.agent(app);
  const csrf = await agent.get("/api/auth/csrf");
  assert.equal(csrf.status, 200);
  const authCsrf = csrf.body.data.csrfToken;
  const registration = await agent
    .post("/api/auth/register")
    .set("x-csrf-token", authCsrf)
    .send({ email, password: "correct horse battery staple" });
  assert.equal(registration.status, 201);
  const loginCsrfResponse = await agent.get("/api/auth/csrf");
  const login = await agent
    .post("/api/auth/login")
    .set("x-csrf-token", loginCsrfResponse.body.data.csrfToken)
    .send({ email, password: "correct horse battery staple" });
  assert.equal(login.status, 200);
  return { agent, userId: registration.body.data.id };
}

async function seedTransaction(userId, {
  type,
  amountMinor,
  currency = "USD",
  category,
  transactionDate,
}) {
  await Transaction.create({
    userId,
    type,
    amountMinor,
    currency,
    category,
    transactionDate: new Date(`${transactionDate}T00:00:00.000Z`),
  });
}

test("reports aggregate only the authenticated user's transactions with inclusive UTC ranges", async () => {
  const owner = await makeAuthenticatedUser("report-owner@example.com");
  const other = await makeAuthenticatedUser("report-other@example.com");

  await seedTransaction(owner.userId, {
    type: "income",
    amountMinor: 100_000,
    category: "salary",
    transactionDate: "2026-01-01",
  });
  await seedTransaction(owner.userId, {
    type: "expense",
    amountMinor: 20_000,
    category: "food",
    transactionDate: "2026-01-31",
  });
  await seedTransaction(owner.userId, {
    type: "expense",
    amountMinor: 5_000,
    category: "travel",
    transactionDate: "2026-03-01",
  });
  await seedTransaction(owner.userId, {
    type: "expense",
    amountMinor: 7_000,
    category: "utilities",
    transactionDate: "2026-02-01",
  });
  await seedTransaction(owner.userId, {
    type: "expense",
    amountMinor: 11_000,
    category: "utilities",
    transactionDate: "2026-04-01",
  });
  await seedTransaction(owner.userId, {
    type: "expense",
    amountMinor: 9_999,
    currency: "EUR",
    category: "food",
    transactionDate: "2026-01-15",
  });
  await seedTransaction(other.userId, {
    type: "income",
    amountMinor: 999_999,
    category: "salary",
    transactionDate: "2026-01-10",
  });
  await seedTransaction(other.userId, {
    type: "expense",
    amountMinor: 999_999,
    category: "food",
    transactionDate: "2026-01-10",
  });

  const summary = await owner.agent
    .get("/api/reports/summary?currency=usd&from=2026-01-01&to=2026-01-31");
  assert.equal(summary.status, 200);
  assert.deepEqual(summary.body, {
    data: {
      currency: "USD",
      range: { from: "2026-01-01", to: "2026-01-31" },
      incomeMinor: 100_000,
      expenseMinor: 20_000,
      netMinor: 80_000,
    },
  });

  const monthly = await owner.agent
    .get("/api/reports/monthly?currency=USD&from=2026-01-15&to=2026-04-01");
  assert.equal(monthly.status, 200);
  assert.deepEqual(monthly.body.data, [
    { month: "2026-01", incomeMinor: 0, expenseMinor: 20_000 },
    { month: "2026-02", incomeMinor: 0, expenseMinor: 7_000 },
    { month: "2026-03", incomeMinor: 0, expenseMinor: 5_000 },
    { month: "2026-04", incomeMinor: 0, expenseMinor: 11_000 },
  ]);

  const categories = await owner.agent
    .get("/api/reports/categories?currency=USD&from=2026-01-01&to=2026-03-31");
  assert.equal(categories.status, 200);
  assert.deepEqual(categories.body.data, [
    { category: "food", expenseMinor: 20_000 },
    { category: "utilities", expenseMinor: 7_000 },
    { category: "travel", expenseMinor: 5_000 },
  ]);
  assert.equal(JSON.stringify(categories.body).includes("salary"), false);

  const forgedUser = await owner.agent
    .get(`/api/reports/summary?currency=USD&userId=${other.userId}`);
  assert.equal(forgedUser.status, 400);

  const emptyMonth = await owner.agent
    .get("/api/reports/monthly?currency=USD&from=2026-05-01&to=2026-07-31");
  assert.deepEqual(emptyMonth.body.data, [
    { month: "2026-05", incomeMinor: 0, expenseMinor: 0 },
    { month: "2026-06", incomeMinor: 0, expenseMinor: 0 },
    { month: "2026-07", incomeMinor: 0, expenseMinor: 0 },
  ]);
});

test("reports reject invalid inputs and return consistent empty results", async () => {
  const owner = await makeAuthenticatedUser("empty-report@example.com");
  const unauthenticated = await request(app)
    .get("/api/reports/summary?currency=USD");
  assert.equal(unauthenticated.status, 401);

  for (const query of [
    "",
    "?currency=US",
    "?currency=USD&from=2026-02-30",
    "?currency=USD&from=2026-03-02&to=2026-03-01",
    "?currency=USD&from=2020-01-01&to=2025-01-02",
    "?currency=USD&unexpected=1",
    "?currency=USD&from=2026-02-29",
  ]) {
    const response = await owner.agent.get(`/api/reports/summary${query}`);
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
  }

  const summary = await owner.agent.get("/api/reports/summary?currency=USD");
  assert.deepEqual(summary.body.data, {
    currency: "USD",
    range: { from: null, to: null },
    incomeMinor: 0,
    expenseMinor: 0,
    netMinor: 0,
  });

  assert.deepEqual(
    (await owner.agent.get("/api/reports/monthly?currency=USD")).body.data,
    [],
  );
  assert.deepEqual(
    (await owner.agent.get("/api/reports/categories?currency=USD")).body.data,
    [],
  );
});
