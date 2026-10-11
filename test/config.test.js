import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config/env.js";

test("loads valid configuration and applies the port default", () => {
  assert.deepEqual(
    loadConfig({
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://localhost/test",
      SESSION_SECRET: "test-session-secret-that-is-over-32-characters",
    }),
    {
      NODE_ENV: "test",
      PORT: 3000,
      TRUST_PROXY_HOPS: 0,
      MONGODB_URI: "mongodb://localhost/test",
      SESSION_SECRET: "test-session-secret-that-is-over-32-characters",
    },
  );
});

test("rejects missing database configuration without exposing secrets", () => {
  assert.throws(
    () => loadConfig({ API_SECRET: "must-not-be-revealed" }),
    (error) => {
      assert.match(error.message, /MONGODB_URI/);
      assert.doesNotMatch(error.message, /must-not-be-revealed/);
      return true;
    },
  );
});

test("rejects invalid ports and environment names", () => {
  assert.throws(() =>
    loadConfig({
      NODE_ENV: "invalid",
      PORT: "70000",
      MONGODB_URI: "mongodb://localhost/test",
      SESSION_SECRET: "test-session-secret-that-is-over-32-characters",
    }),
  );
});

test("rejects a non-MongoDB connection URI", () => {
  assert.throws(
    () =>
      loadConfig({
        MONGODB_URI: "https://example.com",
        SESSION_SECRET: "test-session-secret-that-is-over-32-characters",
      }),
    /valid MongoDB connection URI/,
  );
});

test("rejects missing or weak session secrets", () => {
  for (const secret of [undefined, "too-short"]) {
    assert.throws(
      () =>
        loadConfig({
          MONGODB_URI: "mongodb://localhost/test",
          ...(secret === undefined ? {} : { SESSION_SECRET: secret }),
        }),
      /SESSION_SECRET/,
    );
  }
});
