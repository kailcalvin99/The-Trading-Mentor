import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";
import { seedDefaults } from "./seed";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

seedDefaults().catch((err) => console.error("Seed error:", err));

export default app;
