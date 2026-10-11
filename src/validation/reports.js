import { z } from "zod";

const dateOnly = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date");

const reportQuerySchema = z.object({
  currency: z.string().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
}).strict().refine(({ from, to }) => {
  if (!from || !to) return true;
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  const latestAllowedDate = new Date(fromDate);
  latestAllowedDate.setUTCFullYear(latestAllowedDate.getUTCFullYear() + 5);
  return toDate >= fromDate && toDate <= latestAllowedDate;
}, "Date range must be ordered and no longer than five years");

export function createReportRequestSchema() {
  return z.object({
    body: z.object({}).strict(),
    params: z.object({}).strict(),
    query: reportQuerySchema,
  }).strict();
}
