import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "../artifacts/api-server/src/stripe/stripeClient";
import { getPublicAppUrl } from "../artifacts/api-server/src/config/publicAppUrl";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !process.env.STRIPE_SECRET_KEY) {
  throw new Error("DATABASE_URL and STRIPE_SECRET_KEY are required for the explicit Stripe bootstrap job");
}
const appUrl = getPublicAppUrl();
await runMigrations({ databaseUrl });
const sync = await getStripeSync();
await sync.findOrCreateManagedWebhook(new URL("api/stripe/webhook", appUrl.href.endsWith("/") ? appUrl : `${appUrl.href}/`).toString());
await sync.syncBackfill();
console.log("Explicit Stripe bootstrap completed.");
