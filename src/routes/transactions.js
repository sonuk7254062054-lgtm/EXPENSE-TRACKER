import { Router } from "express";
import { validateRequest } from "../middleware/validate-request.js";
import {
  create,
  getOne,
  list,
  remove,
  update,
} from "../controllers/transaction-controller.js";
import {
  createTransactionSchema,
  listTransactionsSchema,
  transactionIdSchema,
  updateTransactionSchema,
} from "../validation/transactions.js";

export function createTransactionRouter({ requireCsrf: csrf }) {
  const router = Router();
  router.post("/", csrf, validateRequest(createTransactionSchema), create);
  router.get("/", validateRequest(listTransactionsSchema), list);
  router.get("/:id", validateRequest(transactionIdSchema), getOne);
  router.patch("/:id", csrf, validateRequest(updateTransactionSchema), update);
  router.delete("/:id", csrf, validateRequest(transactionIdSchema), remove);
  return router;
}
