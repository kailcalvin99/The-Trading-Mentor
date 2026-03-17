import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

function getJwtSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET or JWT_SECRET environment variable is required");
  }
  return secret;
}

export interface AuthPayload {
  userId: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload & { role: string };
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}

export function setAuthCookie(res: Response, token: string): void {
  const isReplit = !!process.env.REPL_ID;
  res.cookie("token", token, {
    httpOnly: true,
    secure: isReplit || process.env.NODE_ENV === "production",
    sameSite: isReplit ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  const isReplit = !!process.env.REPL_ID;
  res.clearCookie("token", {
    httpOnly: true,
    secure: isReplit || process.env.NODE_ENV === "production",
    sameSite: isReplit ? "none" : "lax",
    path: "/",
  });
}

export async function authRequired(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyToken(token);

    const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, payload.userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = { ...payload, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function adminRequired(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
