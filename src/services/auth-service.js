import { User } from "../models/user.js";
import { hashPassword, verifyPassword } from "./password-service.js";
import { HttpError } from "../errors/http-error.js";

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function registerUser({ email, password }) {
  const passwordHash = await hashPassword(password);
  try {
    return await User.create({ email: normalizeEmail(email), passwordHash });
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, "EMAIL_IN_USE", "An account with this email already exists");
    }
    throw error;
  }
}

export async function authenticateUser({ email, password }) {
  const user = await User.findOne({ email: normalizeEmail(email) })
    .select("+passwordHash");
  let valid = false;
  if (user) {
    valid = await verifyPassword(password, user.passwordHash);
  } else {
    await hashPassword(password);
  }

  return valid ? user : null;
}

export function toPublicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt,
  };
}
