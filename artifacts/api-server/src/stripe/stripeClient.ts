import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

let stripeClient: Stripe | null = null;
let stripeSyncInstance: StripeSync | null = null;

async function getCredentials(): Promise<{ secretKey: string }> {
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";

  if (isProduction) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is required in production");
    return { secretKey: key };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (hostname && xReplitToken) {
    try {
      const url = new URL(`https://${hostname}/api/v2/connection`);
      url.searchParams.set("include_secrets", "true");
      url.searchParams.set("connector_names", "stripe");
      url.searchParams.set("environment", "development");

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-Replit-Token": xReplitToken,
        },
      });

      if (response.ok) {
        const data = await response.json() as { items?: Array<{ settings?: { secret?: string } }> };
        const settings = data.items?.[0]?.settings;
        if (settings?.secret) {
          return { secretKey: settings.secret };
        }
      }
    } catch {}
  }

  const envKey = process.env.STRIPE_SECRET_KEY;
  if (envKey) return { secretKey: envKey };

  throw new Error("Could not find Stripe secret key");
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey);
}

export async function getStripeClient(): Promise<Stripe> {
  if (!stripeClient) {
    stripeClient = await getUncachableStripeClient();
  }
  return stripeClient;
}

export async function getStripeSync(): Promise<StripeSync> {
  if (!stripeSyncInstance) {
    const { secretKey } = await getCredentials();
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required");
    stripeSyncInstance = new StripeSync({ stripeSecretKey: secretKey, databaseUrl, poolConfig: { connectionString: databaseUrl } });
  }
  return stripeSyncInstance;
}
