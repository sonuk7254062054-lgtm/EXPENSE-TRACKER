import { HttpError } from "../errors/http-error.js";
import {
  authenticateUser,
  registerUser,
  toPublicUser,
} from "../services/auth-service.js";

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

export async function register(req, res) {
  const user = await registerUser(req.validated.body);
  return res.status(201).json({ data: toPublicUser(user) });
}

export async function login(req, res) {
  const user = await authenticateUser(req.validated.body);
  if (!user) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  await regenerateSession(req);
  req.session.userId = user._id.toString();
  await saveSession(req);
  return res.status(200).json({ data: toPublicUser(user) });
}

export function currentUser(req, res) {
  return res.status(200).json({ data: toPublicUser(req.auth.user) });
}

export async function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("expense.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/api",
    });
    return res.status(204).end();
  });
}
