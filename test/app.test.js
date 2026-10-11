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
  const app = createTestApp({ trustedProxyHops: 1, production: true });
  const response = await request(app)
    .get("/api/auth/csrf")
    .set("x-forwarded-proto", "https");
  assert.equal(response.status, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.match(response.headers["set-cookie"][0], /Secure/i);
  assert.match(response.headers["set-cookie"][0], /HttpOnly/i);
  assert.match(response.headers["set-cookie"][0], /SameSite=None/i);
});

test("CORS allows only the configured frontend and supports credentialed preflight", async () => {
  const frontendOrigin = "https://expense-tracker.vercel.app";
  const app = createTestApp({
    databaseStatus: () => "connected",
    frontendOrigin,
    production: true,
  });

  const health = await request(app)
    .get("/api/health")
    .set("Origin", frontendOrigin);
  assert.equal(health.status, 200);
  assert.equal(health.headers["access-control-allow-origin"], frontendOrigin);
  assert.equal(health.headers["access-control-allow-credentials"], "true");

  const preflight = await request(app)
    .options("/api/auth/login")
    .set("Origin", frontendOrigin)
    .set("Access-Control-Request-Method", "POST")
    .set("Access-Control-Request-Headers", "content-type,x-csrf-token");
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers["access-control-allow-methods"], /POST/);
  assert.match(preflight.headers["access-control-allow-headers"], /X-CSRF-Token/);

  const denied = await request(app)
    .get("/api/health")
    .set("Origin", "https://untrusted.example.com");
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error.code, "CORS_ORIGIN_DENIED");
});
