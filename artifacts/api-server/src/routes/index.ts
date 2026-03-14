import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geminiRouter from "./gemini";
import propRouter from "./prop";
import tradesRouter from "./trades";
import webhookRouter from "./webhook";
import authRouter from "./auth";
import subscriptionsRouter from "./subscriptions";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/admin", adminRouter);
router.use("/gemini", geminiRouter);
router.use("/prop", propRouter);
router.use("/trades", tradesRouter);
router.use("/webhook", webhookRouter);

export default router;
