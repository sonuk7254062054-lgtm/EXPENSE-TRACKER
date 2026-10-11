import { z } from "zod";

const dateOnly = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date");

const amount = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const currency = z.string().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase());
const category = z.string().trim().min(1).max(64);
const description = z.string().trim().max(500);
const merchant = z.string().trim().max(128);
const transactionType = z.enum(["income", "expense"]);

const transactionFields = {
  type: transactionType,
  amountMinor: amount,
  currency,
  category,
  description: description.optional(),
  merchant: merchant.optional(),
  transactionDate: dateOnly,
};

export const createTransactionSchema = z.object({
  body: z.object(transactionFields).strict(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
}).strict();

export const updateTransactionSchema = z.object({
  body: z.object({
    type: transactionType.optional(),
    amountMinor: amount.optional(),
    currency: currency.optional(),
    category: category.optional(),
    description: description.nullable().optional(),
    merchant: merchant.nullable().optional(),
    transactionDate: dateOnly.optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, "At least one mutable field is required"),
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }).strict(),
  query: z.object({}).strict(),
}).strict();

const integerQuery = (defaultValue, max) => z.string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(max))
  .optional()
  .default(String(defaultValue))
  .transform(Number);

const optionalIntegerQuery = z.string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(0).max(Number.MAX_SAFE_INTEGER))
  .optional()
  .transform((value) => value);

export const listTransactionsSchema = z.object({
  body: z.object({}).strict(),
  params: z.object({}).strict(),
  query: z.object({
    page: integerQuery(1, 100_000),
    limit: integerQuery(20, 100),
    sort: z.enum(["transactionDate", "amountMinor", "createdAt"]).default("transactionDate"),
    order: z.enum(["asc", "desc"]).default("desc"),
    q: z.string().trim().min(1).max(100).optional(),
    type: transactionType.optional(),
    category: category.optional(),
    currency: currency.optional(),
    dateFrom: dateOnly.optional(),
    dateTo: dateOnly.optional(),
    minAmount: optionalIntegerQuery,
    maxAmount: optionalIntegerQuery,
  }).strict(),
}).strict().refine(({ query }) => {
  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) return false;
  if (query.minAmount !== undefined && query.maxAmount !== undefined && query.minAmount > query.maxAmount) return false;
  return true;
}, "Invalid filter range");

export const transactionIdSchema = z.object({
  body: z.object({}).strict(),
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }).strict(),
  query: z.object({}).strict(),
}).strict();
