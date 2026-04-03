import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export function authenticate(required = true) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Collect all candidate tokens in priority order:
    // 1. Authorization header (most explicit — client chose to send it)
    // 2. delivery_token cookie (scoped to delivery portal)
    // 3. token cookie (customer/admin session)
    const candidates: string[] = [];

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      candidates.push(authHeader.slice(7));
    }
    // Allow token in query string (needed for EventSource which cannot set headers)
    if (typeof req.query?.token === "string" && req.query.token) {
      candidates.push(req.query.token);
    }
    if (req.cookies?.delivery_token) {
      candidates.push(req.cookies.delivery_token as string);
    }
    if (req.cookies?.token) {
      candidates.push(req.cookies.token as string);
    }

    let payload: { userId: number; role: string } | null = null;
    for (const candidate of candidates) {
      const p = verifyToken(candidate);
      if (p) {
        payload = p;
        break;
      }
    }

    if (!payload) {
      if (required) {
        res.status(401).json({ error: "Unauthorized" });
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

export function requireDelivery(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "delivery") {
    res.status(403).json({ error: "Forbidden - Delivery only" });
    return;
  }
  next();
}
