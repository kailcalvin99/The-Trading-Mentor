import Stripe from "stripe";

async function getStripeSecret(): Promise<string> {
  const envKey = process.env.STRIPE_SECRET_KEY;
  if (envKey) return envKey;

  throw new Error("STRIPE_SECRET_KEY environment variable is required. Set it before running this script.");
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const secret = await getStripeSecret();
  return new Stripe(secret);
}
