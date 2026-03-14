import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";
import { seedDefaults } from "./seed";

const app: Express = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const replitDomain = process.env.REPLIT_DEV_DOMAIN || "";
    if (
      allowedOrigins.includes(origin) ||
      (replitDomain && origin.includes(replitDomain)) ||
      origin.includes(".replit.dev") ||
      origin.includes(".repl.co") ||
      origin.startsWith("http://localhost")
    ) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

seedDefaults().catch((err) => console.error("Seed error:", err));

export default app;
