import { getUncachableStripeClient } from "./stripeClient";
import { db, subscriptionTiersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seedStripeProducts() {
  const stripe = await getUncachableStripeClient();
  console.log("Connected to Stripe. Creating products and prices...\n");

  const tiers = await db.select().from(subscriptionTiersTable).where(eq(subscriptionTiersTable.isActive, true));
  const paidTiers = tiers.filter(t => t.level > 0).sort((a, b) => a.level - b.level);

  for (const tier of paidTiers) {
    console.log(`--- ${tier.name} (Level ${tier.level}) ---`);

    if (tier.stripePriceIdMonthly && tier.stripePriceIdAnnual) {
      console.log(`  Already has Stripe Price IDs. Skipping.`);
      console.log(`    Monthly: ${tier.stripePriceIdMonthly}`);
      console.log(`    Annual:  ${tier.stripePriceIdAnnual}\n`);
      continue;
    }

    const existing = await stripe.products.search({
      query: `name:'${tier.name}' AND active:'true'`,
    });

    let product;
    if (existing.data.length > 0) {
      product = existing.data[0];
      console.log(`  Product already exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: tier.name,
        description: tier.description || `${tier.name} subscription plan`,
        metadata: {
          tierLevel: String(tier.level),
          tierId: String(tier.id),
        },
      });
      console.log(`  Created product: ${product.id}`);
    }

    const monthlyAmountCents = Math.round(parseFloat(tier.monthlyPrice) * 100);
    const annualAmountCents = Math.round(parseFloat(tier.annualPrice) * 100);

    let monthlyPriceId = tier.stripePriceIdMonthly;
    let annualPriceId = tier.stripePriceIdAnnual;

    if (!monthlyPriceId) {
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: monthlyAmountCents,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { tierId: String(tier.id), billingCycle: "monthly" },
      });
      monthlyPriceId = monthlyPrice.id;
      console.log(`  Created monthly price: $${tier.monthlyPrice}/mo (${monthlyPriceId})`);
    }

    if (!annualPriceId) {
      const annualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: annualAmountCents,
        currency: "usd",
        recurring: { interval: "year" },
        metadata: { tierId: String(tier.id), billingCycle: "annual" },
      });
      annualPriceId = annualPrice.id;
      console.log(`  Created annual price: $${tier.annualPrice}/yr (${annualPriceId})`);
    }

    await db.update(subscriptionTiersTable)
      .set({
        stripePriceIdMonthly: monthlyPriceId,
        stripePriceIdAnnual: annualPriceId,
      })
      .where(eq(subscriptionTiersTable.id, tier.id));

    console.log(`  Updated DB with Stripe Price IDs\n`);
  }

  console.log("Done! Stripe products and prices are ready.");
  process.exit(0);
}

seedStripeProducts().catch((err) => {
  console.error("Error seeding Stripe products:", err);
  process.exit(1);
});
