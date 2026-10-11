import { Router } from "express";
import rateLimit from "express-rate-limit";
import { randomBytes } from "node:crypto";
import { validateRequest } from "../middleware/validate-request.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  currentUser,
  login,
  logout,
  register,
} from "../controllers/auth-controller.js";
import { loginSchema, registerSchema } from "../validation/auth.js";

export function createAuthRouter({ requireCsrf: csrf }) {
  const router = Router();
  const authenticationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: { code: "RATE_LIMITED", message: "Too many authentication attempts" },
    },
  });

  router.get("/csrf", (req, res) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString("hex");
    }
    return res.status(200).json({ data: { csrfToken: req.session.csrfToken } });
  });
  router.post("/register", authenticationLimiter, csrf, validateRequest(registerSchema), register);
  router.post("/login", authenticationLimiter, csrf, validateRequest(loginSchema), login);
  router.get("/me", authenticate, currentUser);
  router.post("/logout", authenticate, csrf, logout);

  return router;
}
