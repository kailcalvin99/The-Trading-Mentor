import type { RequestHandler } from "express";

export function destructiveResetAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && env.ENABLE_DESTRUCTIVE_ADMIN_RESET?.toLowerCase() === "true";
}

export const requireDestructiveResetEnabled: RequestHandler = (_req, res, next) => {
  if (!destructiveResetAllowed()) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
};
