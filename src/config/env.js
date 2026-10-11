import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  FRONTEND_ORIGIN: z.string().url().optional(),
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

function isLocalHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "0.0.0.0"
  );
}

export function loadConfig(env = process.env) {
  const result = environmentSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map(({ path, message }) => `${path.join(".")}: ${message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  if (result.data.NODE_ENV === "production") {
    const databaseUri = new URL(result.data.MONGODB_URI);
    if (databaseUri.protocol !== "mongodb+srv:" || isLocalHostname(databaseUri.hostname)) {
      throw new Error("Invalid environment configuration: production MONGODB_URI must be a MongoDB Atlas SRV URI");
    }

    const origin = result.data.FRONTEND_ORIGIN;
    if (!origin) {
      throw new Error("Invalid environment configuration: FRONTEND_ORIGIN is required in production");
    }

    const parsedOrigin = new URL(origin);
    if (parsedOrigin.origin !== origin || parsedOrigin.protocol !== "https:") {
      throw new Error("Invalid environment configuration: FRONTEND_ORIGIN must be an HTTPS origin without a path");
    }
  }

  return result.data;
}
