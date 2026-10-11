import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import session from "express-session";
import { createApp } from "../src/app.js";

function createTestApp(options = {}) {
  return createApp({
    ...options,
    sessionSecret: "test-session-secret-that-is-over-32-characters",
    sessionStore: new session.MemoryStore(),
  });
}

test("health reports database readiness", async () => {
  const response = await request(
    createTestApp({ databaseStatus: () => "disconnected" }),
  ).get("/api/health");

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, {
    status: "unavailable",
    database: "disconnected",
  });
});

test("health succeeds when the database is connected", async () => {
  const response = await request(
    createTestApp({ databaseStatus: () => "connected" }),
  ).get("/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.deepEqual(response.body, {
    status: "ok",
    database: "connected",
  });
});

test("unknown routes use the centralized not-found response", async () => {
  const response = await request(
    createTestApp({ databaseStatus: () => "connected" }),
  ).get("/not-a-route");

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

test("malformed JSON receives a client error without leaking parser details", async () => {
  const response = await request(
    createTestApp({ databaseStatus: () => "connected" }),
  )
    .post("/api/health")
    .set("Content-Type", "application/json")
    .send('{"secret":"broken"');

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    error: {
      code: "REQUEST_ERROR",
      message: "Malformed JSON request body",
    },
  });
});

test("production auth cookie includes Secure", async () => {
  const priorEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const app = createTestApp({ trustedProxyHops: 1 });
    const response = await request(app)
      .get("/api/auth/csrf")
      .set("x-forwarded-proto", "https");
    assert.equal(response.status, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.match(response.headers["set-cookie"][0], /Secure/i);
    assert.match(response.headers["set-cookie"][0], /HttpOnly/i);
    assert.match(response.headers["set-cookie"][0], /SameSite=Lax/i);
  } finally {
    if (priorEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = priorEnvironment;
    }
  }
});
