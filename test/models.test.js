import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Transaction } from "../src/models/transaction.js";
import { User } from "../src/models/user.js";

test("user model requires a non-selected password hash", () => {
  const user = new User();
  const error = user.validateSync();

  assert.ok(error);
  assert.ok(error.errors.passwordHash);
  assert.equal(User.schema.path("passwordHash").options.select, false);
});

test("transaction model requires an indexed user ownership reference", () => {
  const transaction = new Transaction();
  const error = transaction.validateSync();

  assert.ok(error);
  assert.ok(error.errors.userId);
  assert.equal(
    Transaction.schema.path("userId").instance,
    "ObjectId",
  );
  assert.equal(Transaction.schema.path("userId").options.ref, "User");
  assert.equal(Transaction.schema.path("userId").options.index, true);
  assert.ok(mongoose.models.User);
});

test("transaction schema validates the approved transaction fields", () => {
  const valid = new Transaction({
    userId: new mongoose.Types.ObjectId(),
    type: "expense",
    amountMinor: 250,
    currency: "USD",
    category: "food",
    transactionDate: new Date("2026-10-10T00:00:00.000Z"),
  });
  assert.equal(valid.validateSync(), undefined);

  const invalid = new Transaction({
    userId: new mongoose.Types.ObjectId(),
    type: "transfer",
    amountMinor: 1.5,
    currency: "US",
    category: "",
    transactionDate: "not-a-date",
  });
  const error = invalid.validateSync();
  assert.ok(error);
  assert.ok(error.errors.type);
  assert.ok(error.errors.amountMinor);
  assert.ok(error.errors.currency);
  assert.ok(error.errors.category);
  assert.ok(error.errors.transactionDate);
});
