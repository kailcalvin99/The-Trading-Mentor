import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

let stripeClient: Stripe | null = null;
let stripeSyncInstance: StripeSync | null = null;

type ReplitStripeConnection = {
  secret?: string;
  settings?: { secret?: string };
  configuration?: { secret?: string };
};

async function getStripeSecret(): Promise<string> {
  const replitDeployment = process.env.REPLIT_DEPLOYMENT;
  if (replitDeployment) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is required in production");
    return key;
  }

  try {
    const connectionsRes = await fetch(
      "https://eval.replit.com/connections/stripe",
      { headers: { "Content-Type": "application/json" } }
    );
    if (connectionsRes.ok) {
      const data = (await connectionsRes.json()) as ReplitStripeConnection | ReplitStripeConnection[];
      if (Array.isArray(data)) {
        if (data[0]?.settings?.secret) return data[0].settings.secret;
        if (data[0]?.configuration?.secret) return data[0].configuration.secret;
      } else if (data.secret) {
        return data.secret;
      }
    }
  } catch {}

  const envKey = process.env.STRIPE_SECRET_KEY;
  if (envKey) return envKey;

  throw new Error("Could not find Stripe secret key");
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const secret = await getStripeSecret();
  return new Stripe(secret);
}

export async function getStripeClient(): Promise<Stripe> {
  if (!stripeClient) {
    stripeClient = await getUncachableStripeClient();
  }
  return stripeClient;
}

export async function getStripeSync(): Promise<StripeSync> {
  if (!stripeSyncInstance) {
    const secret = await getStripeSecret();
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required");
    stripeSyncInstance = new StripeSync({
      stripeSecretKey: secret,
      databaseUrl,
      poolConfig: { connectionString: databaseUrl },
    });
  }
  return stripeSyncInstance;
}
