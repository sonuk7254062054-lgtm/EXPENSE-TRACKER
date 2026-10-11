import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { validateRequest } from "../src/middleware/validate-request.js";

test("request validation forwards parsed values", () => {
  const middleware = validateRequest(
    z.object({
      body: z.object({ count: z.coerce.number().int() }),
      params: z.object({}),
      query: z.object({}),
    }),
  );
  const req = {
    body: { count: "4" },
    params: {},
    query: {},
  };
  let nextCalled = false;

  middleware(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.validated.body.count, 4);
});

test("request validation returns a consistent client error", () => {
  const middleware = validateRequest(
    z.object({
      body: z.object({ count: z.number().int() }),
      params: z.object({}),
      query: z.object({}),
    }),
  );
  let response;
  let nextCalled = false;

  middleware(
    { body: { count: "not-a-number" }, params: {}, query: {} },
    {
      status(statusCode) {
        response = { statusCode };
        return {
          json(body) {
            response.body = body;
            return response;
          },
        };
      },
    },
    () => {
      nextCalled = true;
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.equal(nextCalled, false);
});
