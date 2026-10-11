import express from "express";
import { getDatabaseStatus } from "./db/connection.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { createHealthRouter } from "./routes/health.js";
import session from "express-session";
import { createAuthRouter } from "./routes/auth.js";
import { createTransactionRouter } from "./routes/transactions.js";
import { authenticate } from "./middleware/authenticate.js";
import { requireCsrf } from "./middleware/csrf.js";
import { createReportRouter } from "./routes/reports.js";

export function createApp({
  databaseStatus = getDatabaseStatus,
  sessionSecret,
  sessionStore,
  trustedProxyHops = 0,
} = {}) {
  if (!sessionSecret || !sessionStore) {
    throw new Error("Session secret and persistent session store are required");
  }

  const app = express();

  app.disable("x-powered-by");
  if (trustedProxyHops > 0) {
    app.set("trust proxy", trustedProxyHops);
  }
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    return next();
  });
  app.use(
    session({
      name: "expense.sid",
      secret: sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api",
        maxAge: 24 * 60 * 60 * 1000,
      },
    }),
  );
  app.use("/api", createHealthRouter(databaseStatus));
  app.use("/api/auth", createAuthRouter({ requireCsrf: requireCsrf() }));
  app.use("/api/transactions", authenticate, createTransactionRouter({
    requireCsrf: requireCsrf(),
  }));
  app.use("/api/reports", authenticate, createReportRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
