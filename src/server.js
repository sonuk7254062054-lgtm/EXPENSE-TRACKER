import { createServer } from "node:http";
import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import {
  connectDatabase,
  disconnectDatabase,
} from "./db/connection.js";

async function startServer() {
  const config = loadConfig();
  await connectDatabase(config.MONGODB_URI);

  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: "sessions",
    ttl: 24 * 60 * 60,
  });
  const server = createServer(createApp({
    sessionSecret: config.SESSION_SECRET,
    sessionStore,
    trustedProxyHops: config.TRUST_PROXY_HOPS,
    frontendOrigin: config.FRONTEND_ORIGIN,
    production: config.NODE_ENV === "production",
  }));
  server.listen(config.PORT, () => {
    console.info(`Expense Tracker API listening on port ${config.PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    server.close(async (error) => {
      if (error) {
        console.error("HTTP server shutdown failed", error);
        process.exitCode = 1;
      }

      try {
        await sessionStore.close();
        await disconnectDatabase();
      } catch (disconnectError) {
        console.error("Database shutdown failed", disconnectError);
        process.exitCode = 1;
      }

      if (signal) {
        console.info(`Shutdown complete after ${signal}`);
      }
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("Server startup failed", { name: error.name });
  process.exitCode = 1;
});
