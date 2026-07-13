import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { checkDatabaseReadiness } from "../operations/readiness";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (_req, res) => {
  const ready = await checkDatabaseReadiness(pool);
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable" });
});

export default router;
