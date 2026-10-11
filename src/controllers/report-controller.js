import {
  getCategoryExpenses,
  getMonthlyTotals,
  getSummary,
} from "../services/report-service.js";

export async function summary(req, res) {
  const data = await getSummary(req.auth.userId, req.validated.query);
  return res.status(200).json({ data });
}

export async function monthly(req, res) {
  const data = await getMonthlyTotals(req.auth.userId, req.validated.query);
  return res.status(200).json({ data });
}

export async function categories(req, res) {
  const data = await getCategoryExpenses(req.auth.userId, req.validated.query);
  return res.status(200).json({ data });
}
