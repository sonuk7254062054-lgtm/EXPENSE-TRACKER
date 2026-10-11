import mongoose from "mongoose";
import { User } from "../models/user.js";

export async function authenticate(req, res, next) {
  const userId = req.session?.userId;
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(401).json({
      error: { code: "UNAUTHENTICATED", message: "Authentication required" },
    });
  }

  try {
    const user = await User.findById(userId)
      .select("_id email createdAt")
      .lean();
    if (!user) {
      return res.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Authentication required" },
      });
    }

    req.auth = { userId: user._id.toString(), user };
    return next();
  } catch (error) {
    return next(error);
  }
}
