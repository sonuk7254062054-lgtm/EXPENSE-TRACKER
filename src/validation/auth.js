import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128),
  }).strict(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
}).strict();

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128),
  }).strict(),
  params: z.object({}).strict(),
  query: z.object({}).strict(),
}).strict();
