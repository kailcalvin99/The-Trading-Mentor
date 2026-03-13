import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geminiRouter from "./gemini";
import propRouter from "./prop";
import tradesRouter from "./trades";
import webhookRouter from "./webhook";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/gemini", geminiRouter);
router.use("/prop", propRouter);
router.use("/trades", tradesRouter);
router.use("/webhook", webhookRouter);

export default router;
