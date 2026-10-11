import { Router } from "express";
import { validateRequest } from "../middleware/validate-request.js";
import {
  categories,
  monthly,
  summary,
} from "../controllers/report-controller.js";
import { createReportRequestSchema } from "../validation/reports.js";

export function createReportRouter() {
  const router = Router();
  const validateReportRequest = validateRequest(createReportRequestSchema());

  router.get("/summary", validateReportRequest, summary);
  router.get("/monthly", validateReportRequest, monthly);
  router.get("/categories", validateReportRequest, categories);

  return router;
}
