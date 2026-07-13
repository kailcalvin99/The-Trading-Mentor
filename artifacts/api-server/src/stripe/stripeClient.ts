import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

let stripeClient: Stripe | null = null;
let stripeSyncInstance: StripeSync | null = null;

async function getCredentials(): Promise<{ secretKey: string }> {
  const envKey = process.env.STRIPE_SECRET_KEY;
  if (envKey) return { secretKey: envKey };
  throw new Error("STRIPE_SECRET_KEY is required");
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
