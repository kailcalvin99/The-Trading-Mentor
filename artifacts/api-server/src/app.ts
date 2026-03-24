import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { seedDefaults } from "./seed";
import { WebhookHandlers } from "./stripe/webhookHandlers";

const app: Express = express();

app.set("trust proxy", 1);

// FIX #10: enable Content Security Policy — API server serves no HTML so this is strict
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'none'"],
      fontSrc: ["'none'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

const isProduction = !!(process.env.REPLIT_DEPLOYMENT || process.env.NODE_ENV === "production");

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const replitDomain = process.env.REPLIT_DEV_DOMAIN || "";
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (isProduction) {
      callback(new Error("Not allowed by CORS"));
      return;
    }
    if (
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

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith("/auth"),
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Webhook rate limit reached. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "AI rate limit reached. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

const stripeWebhookMiddleware = express.raw({ type: "application/json" });

async function handleStripeWebhook(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    res.status(400).json({ error: "Missing stripe-signature" });
    return;
  }

  try {
    const sig = Array.isArray(signature) ? signature[0] : signature;

    if (!Buffer.isBuffer(req.body)) {
      console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
      res.status(500).json({ error: "Webhook processing error" });
      return;
    }

    await WebhookHandlers.processWebhook(req.body as Buffer, sig);
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error.message);
    res.status(400).json({ error: "Webhook processing error" });
  }
}

app.post("/api/stripe/webhook", stripeWebhookMiddleware, handleStripeWebhook);
app.post("/stripe/webhook", stripeWebhookMiddleware, handleStripeWebhook);

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use("/api", generalApiLimiter);
app.use("/api/gemini", aiLimiter);
app.use("/api/webhook", webhookLimiter);
app.use("/api", router);

app.use("/", generalApiLimiter);
app.use("/gemini", aiLimiter);
app.use("/webhook", webhookLimiter);
app.use("/", router);

seedDefaults().catch((err) => console.error("Seed error:", err));

export default app;
