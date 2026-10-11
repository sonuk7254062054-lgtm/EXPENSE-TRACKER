import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import session from "express-session";
import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/user.js";
import { Transaction } from "../src/models/transaction.js";
import { verifyPassword } from "../src/services/password-service.js";

const databaseName = `expense_tracker_test_${process.pid}_${Date.now()}`;
const databaseUri = `mongodb://127.0.0.1:27017/${databaseName}`;
const sessionSecret = "test-session-secret-that-is-over-32-characters";
let sessionStore;
let app;

before(async () => {
  await mongoose.connect(databaseUri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.init(), Transaction.init()]);
  sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: "test_sessions",
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

async function csrf(agent) {
  const response = await agent.get("/api/auth/csrf");
  assert.equal(response.status, 200);
  return response.body.data.csrfToken;
}

async function registerAndLogin(email) {
  const agent = request.agent(app);
  let token = await csrf(agent);
  const registration = await agent
    .post("/api/auth/register")
    .set("x-csrf-token", token)
    .send({ email, password: "correct horse battery staple" });
  assert.equal(registration.status, 201);

  token = await csrf(agent);
  const login = await agent
    .post("/api/auth/login")
    .set("x-csrf-token", token)
    .send({ email, password: "correct horse battery staple" });
  assert.equal(login.status, 200);
  return { agent, user: registration.body.data };
}

const transactionPayload = (overrides = {}) => ({
  type: "expense",
  amountMinor: 4250,
  currency: "USD",
  category: "groceries",
  description: "Weekly groceries",
  merchant: "Market",
  transactionDate: "2026-10-10",
  ...overrides,
});

test("registration normalizes unique email, hashes passwords, and login manages sessions safely", async () => {
  const agent = request.agent(app);
  let token = await csrf(agent);
  const registration = await agent
    .post("/api/auth/register")
    .set("x-csrf-token", token)
    .send({ email: "  User@Example.com ", password: "correct horse battery staple" });

  assert.equal(registration.status, 201);
  assert.equal(registration.body.data.email, "user@example.com");
  assert.equal(JSON.stringify(registration.body).includes("passwordHash"), false);

  const invalidEmail = await agent
    .post("/api/auth/register")
    .set("x-csrf-token", token)
    .send({ email: "not-an-email", password: "correct horse battery staple" });
  assert.equal(invalidEmail.status, 400);

  const storedUser = await User.findById(registration.body.data.id).select("+passwordHash");
  assert.notEqual(storedUser.passwordHash, "correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", storedUser.passwordHash), true);
  assert.equal(await verifyPassword("incorrect password", storedUser.passwordHash), false);

  const duplicateAgent = request.agent(app);
  token = await csrf(duplicateAgent);
  const duplicate = await duplicateAgent
    .post("/api/auth/register")
    .set("x-csrf-token", token)
    .send({ email: "USER@example.com", password: "correct horse battery staple" });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, "EMAIL_IN_USE");

  const unauthenticatedMe = await agent.get("/api/auth/me");
  assert.equal(unauthenticatedMe.status, 401);

  token = await csrf(agent);
  const invalidLogin = await agent
    .post("/api/auth/login")
    .set("x-csrf-token", token)
    .send({ email: "user@example.com", password: "not the password" });
  assert.equal(invalidLogin.status, 401);
  assert.deepEqual(invalidLogin.body.error, {
    code: "INVALID_CREDENTIALS",
    message: "Email or password is incorrect",
  });

  const priorCookie = (await agent.get("/api/auth/csrf")).headers["set-cookie"]?.[0];
  assert.ok(priorCookie);
  token = await csrf(agent);
  const login = await agent
    .post("/api/auth/login")
    .set("x-csrf-token", token)
    .send({ email: "user@example.com", password: "correct horse battery staple" });
  assert.equal(login.status, 200);
  assert.equal(JSON.stringify(login.body).includes("passwordHash"), false);
  const authCookie = login.headers["set-cookie"]?.find((cookie) => cookie.startsWith("expense.sid="));
  assert.ok(authCookie);
  assert.match(authCookie, /HttpOnly/i);
  assert.match(authCookie, /SameSite=Lax/i);
  assert.match(authCookie, /Path=\/api/i);
  assert.notEqual(authCookie.split(";")[0], priorCookie.split(";")[0]);

  const currentUser = await agent.get("/api/auth/me");
  assert.equal(currentUser.status, 200);
  assert.equal(currentUser.body.data.email, "user@example.com");
  assert.equal(JSON.stringify(currentUser.body).includes("passwordHash"), false);

  token = await csrf(agent);
  const logout = await agent
    .post("/api/auth/logout")
    .set("x-csrf-token", token);
  assert.equal(logout.status, 204);
  assert.match(logout.headers["set-cookie"][0], /expense\.sid=;/);
  assert.equal((await agent.get("/api/auth/me")).status, 401);
});

test("transaction APIs validate input and enforce ownership for every operation", async () => {
  const owner = await registerAndLogin("owner@example.com");
  const other = await registerAndLogin("other@example.com");
  const ownerToken = await csrf(owner.agent);
  const otherToken = await csrf(other.agent);

  const unauthenticated = await request(app)
    .get("/api/transactions");
  assert.equal(unauthenticated.status, 401);

  const missingCsrf = await owner.agent
    .post("/api/transactions")
    .send(transactionPayload());
  assert.equal(missingCsrf.status, 403);

  const spoofOwner = await owner.agent
    .post("/api/transactions")
    .set("x-csrf-token", ownerToken)
    .send(transactionPayload({ userId: other.user.id }));
  assert.equal(spoofOwner.status, 400);
  assert.equal(spoofOwner.body.error.code, "VALIDATION_ERROR");

  const invalidAmount = await owner.agent
    .post("/api/transactions")
    .set("x-csrf-token", ownerToken)
    .send(transactionPayload({ amountMinor: 1.5 }));
  assert.equal(invalidAmount.status, 400);

  const invalidDate = await owner.agent
    .post("/api/transactions")
    .set("x-csrf-token", ownerToken)
    .send(transactionPayload({ transactionDate: "2026-02-30" }));
  assert.equal(invalidDate.status, 400);

  const created = [];
  for (const input of [
    transactionPayload({ amountMinor: 2000, merchant: "A shop" }),
    transactionPayload({ amountMinor: 1000, type: "income", category: "salary" }),
    transactionPayload({ amountMinor: 3000, category: "travel" }),
  ]) {
    const response = await owner.agent
      .post("/api/transactions")
      .set("x-csrf-token", ownerToken)
      .send(input);
    assert.equal(response.status, 201);
    created.push(response.body.data);
  }

  const otherCreated = await other.agent
    .post("/api/transactions")
    .set("x-csrf-token", otherToken)
    .send(transactionPayload({ amountMinor: 9000 }));
  assert.equal(otherCreated.status, 201);

  const list = await owner.agent.get("/api/transactions?limit=2&page=1&sort=amountMinor&order=asc");
  assert.equal(list.status, 200);
  assert.equal(list.body.pagination.total, 3);
  assert.equal(list.body.pagination.pages, 2);
  assert.deepEqual(list.body.data.map(({ amountMinor }) => amountMinor), [1000, 2000]);

  const filtered = await owner.agent.get("/api/transactions?type=expense&category=travel&dateFrom=2026-10-10&dateTo=2026-10-10");
  assert.equal(filtered.body.pagination.total, 1);
  assert.equal(filtered.body.data[0].category, "travel");
  assert.equal(
    (await owner.agent.get("/api/transactions?q=.*")).body.pagination.total,
    0,
  );
  assert.equal(
    (await owner.agent.get("/api/transactions?minAmount=2500&maxAmount=3500")).body.pagination.total,
    1,
  );

  const otherList = await other.agent.get("/api/transactions");
  assert.equal(otherList.body.pagination.total, 1);
  assert.equal(otherList.body.data[0].userId, other.user.id);

  for (const query of [
    "?page=0",
    "?limit=101",
    "?sort=userId",
    "?unexpected=1",
    "?dateFrom=2026-10-11&dateTo=2026-10-10",
    "?minAmount=500&maxAmount=10",
  ]) {
    assert.equal((await owner.agent.get(`/api/transactions${query}`)).status, 400);
  }

  assert.equal((await owner.agent.get("/api/transactions/not-an-object-id")).status, 400);
  assert.equal(
    (await owner.agent.get(`/api/transactions/${otherCreated.body.data._id}`)).status,
    404,
  );
  const ownRead = await owner.agent.get(`/api/transactions/${created[0]._id}`);
  assert.equal(ownRead.status, 200);
  assert.equal(ownRead.body.data._id, created[0]._id);
  assert.equal(
    (await owner.agent.patch(`/api/transactions/${otherCreated.body.data._id}`)
      .set("x-csrf-token", ownerToken)
      .send({ category: "stolen" })).status,
    404,
  );
  assert.equal(
    (await owner.agent.delete(`/api/transactions/${otherCreated.body.data._id}`)
      .set("x-csrf-token", ownerToken)).status,
    404,
  );

  const updated = await owner.agent
    .patch(`/api/transactions/${created[0]._id}`)
    .set("x-csrf-token", ownerToken)
    .send({ category: "home", description: null });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.category, "home");
  assert.equal(updated.body.data.description, null);

  assert.equal(
    (await owner.agent.patch(`/api/transactions/${created[0]._id}`)
      .set("x-csrf-token", ownerToken)
      .send({ userId: other.user.id })).status,
    400,
  );
  assert.equal(
    (await owner.agent.patch(`/api/transactions/${created[0]._id}`)
      .set("x-csrf-token", ownerToken)
      .send({ createdAt: "2026-10-10T00:00:00.000Z" })).status,
    400,
  );
  assert.equal(
    (await owner.agent.patch(`/api/transactions/${created[0]._id}`)
      .set("x-csrf-token", ownerToken)
      .send({})).status,
    400,
  );
  assert.equal(
    (await owner.agent.delete(`/api/transactions/${created[0]._id}`)
      .set("x-csrf-token", ownerToken)).status,
    204,
  );
  assert.equal(
    (await owner.agent.get(`/api/transactions/${created[0]._id}`)).status,
    404,
  );
});

test("authentication attempts are rate limited", async () => {
  const limitedApp = createApp({
    sessionSecret,
    sessionStore: new session.MemoryStore(),
  });
  const statuses = [];
  for (let attempt = 0; attempt < 11; attempt += 1) {
    const response = await request(limitedApp)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "wrong-password" });
    statuses.push(response.status);
  }

  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(403));
  assert.equal(statuses[10], 429);
});
