import type { RequestHandler } from "express";

export const AI_DISABLED_RESPONSE = { error: "AI is disabled in this environment.", code: "AI_DISABLED", disabled: true } as const;

export function isAiEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AI_ENABLED?.trim().toLowerCase() === "true";
}

export const requireAiEnabled: RequestHandler = (_req, res, next) => {
  if (!isAiEnabled()) { res.status(503).json(AI_DISABLED_RESPONSE); return; }
  next();
};
