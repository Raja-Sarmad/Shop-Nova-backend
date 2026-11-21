import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User.js";
import { forbidden, unauthorized } from "../utils/errors.js";
import { verifyToken } from "../utils/tokens.js";

export type AuthUser = {
  id: string;
  role: "customer" | "admin";
  email: string;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function protect(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(unauthorized("Login required"));
  }

  try {
    const token = header.slice(7);
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select("name email role isActive");
    if (!user || !user.isActive) {
      return next(unauthorized("Account not found or inactive"));
    }
    req.user = {
      id: user._id.toString(),
      role: user.role as "customer" | "admin",
      email: user.email,
      name: user.name,
    };
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "admin") return next(forbidden("Admin only"));
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  protect(req, _res, next);
}
