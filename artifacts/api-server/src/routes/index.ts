import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geminiRouter from "./gemini";
import propRouter from "./prop";
import tradesRouter from "./trades";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/gemini", geminiRouter);
router.use("/prop", propRouter);
router.use("/trades", tradesRouter);

export default router;
