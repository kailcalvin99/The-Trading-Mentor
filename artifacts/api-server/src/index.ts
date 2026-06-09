import app from "./app";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripe/stripeClient";

function getWebhookBaseUrl() {
  const domain =
    process.env.APP_DOMAIN ||
    process.env.PUBLIC_DOMAIN ||
    process.env.EXPO_PUBLIC_DOMAIN ||
    process.env.REPLIT_DOMAINS?.split(",")[0];

  if (!domain) return null;

  const normalized = domain.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("DATABASE_URL not set, skipping Stripe init");
    return;
  }

  try {
    console.log("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    console.log("Stripe schema ready");

    const stripeSync = await getStripeSync();
    console.log("Stripe sync initialized");

    const webhookBaseUrl = getWebhookBaseUrl();
    if (webhookBaseUrl) {
      const webhookResult = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`
      );
      console.log("Webhook configured:", webhookResult?.url || "setup complete");
    } else {
      console.warn("No public app domain set, skipping Stripe webhook setup");
    }

    stripeSync.syncBackfill()
      .then(() => console.log("Stripe data synced"))
      .catch((err: any) => console.error("Error syncing Stripe data:", err.message));
  } catch (error: any) {
    console.error("Failed to initialize Stripe:", error.message);
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer() {
  await initStripe();

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Failed to start server:", message);
  process.exit(1);
});
