import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  MONGODB_URI: z
    .string()
    .trim()
    .min(1, "MONGODB_URI must not be empty")
    .refine((uri) => {
      try {
        const parsed = new URL(uri);
        return (
          ["mongodb:", "mongodb+srv:"].includes(parsed.protocol) &&
          Boolean(parsed.hostname)
        );
      } catch {
        return false;
      }
    }, "MONGODB_URI must be a valid MongoDB connection URI"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must contain at least 32 characters")
    .refine(
      (secret) => secret !== "replace-this-with-a-random-secret-of-at-least-32-characters",
      "SESSION_SECRET must be replaced with a random secret",
    ),
});

export function loadConfig(env = process.env) {
  const result = environmentSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map(({ path, message }) => `${path.join(".")}: ${message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
}
