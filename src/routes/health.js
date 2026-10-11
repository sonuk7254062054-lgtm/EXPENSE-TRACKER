import { Router } from "express";

export function createHealthRouter(getDatabaseStatus) {
  const router = Router();

  router.get("/health", (req, res) => {
    const database = getDatabaseStatus();
    const ready = database === "connected";

    return res.status(ready ? 200 : 503).json({
      status: ready ? "ok" : "unavailable",
      database,
    });
  });

  return router;
}
