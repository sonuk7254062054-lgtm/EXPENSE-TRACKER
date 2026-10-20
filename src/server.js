import { createServer } from "node:http";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import { loadConfig } from "./config/env.js";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./db/connection.js";

async function startServer() {
  const config = loadConfig();

  await connectDatabase(config.MONGODB_URI);
  console.info("MongoDB Connected Successfully! 🎉");

  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: "sessions",
    ttl: 24 * 60 * 60,
  });

  // Generate your core Express framework instance
  const app = createApp({
    sessionSecret: config.SESSION_SECRET,
    sessionStore,
    trustedProxyHops: config.TRUST_PROXY_HOPS,
    frontendOrigin: config.FRONTEND_ORIGIN,
    production: config.NODE_ENV === "production",
  });

  // Initialize HTTP Server with a custom interceptor for health checks
  const server = createServer((req, res) => {
    // Intercept exact matching "/health" path
    if (req.url === '/health' && req.method === 'GET') {
      const isDbConnected = mongoose.connection.readyState === 1;

      res.writeHead(isDbConnected ? 200 : 503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: isDbConnected ? 'UP' : 'DOWN',
        database: isDbConnected ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`
      }));
    }

    // Forward all other application traffic straight to Express
    app(req, res);
  });

  server.listen(config.PORT, () => {
    console.info(`Expense Tracker API listening on port ${config.PORT}`);
  });

  // Graceful shutdown handling
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
  console.error("Server startup failed", {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
  process.exitCode = 1;
});
