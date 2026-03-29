import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export function authenticate(required = true) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Check httpOnly cookie first, then fall back to Bearer header
    let token: string | null = null;

    if (req.cookies?.token) {
      token = req.cookies.token as string;
    } else {
      const authHeader = req.headers.authorization;
      token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    }

    if (!token) {
      if (required) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      return next();
    }

    const payload = verifyToken(token);
    if (!payload) {
      if (required) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
      return next();
    }

    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden - Admin only" });
    return;
  }
  next();
}
