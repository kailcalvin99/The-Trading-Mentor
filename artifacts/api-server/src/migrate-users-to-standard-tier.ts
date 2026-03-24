import { db } from "@workspace/db";
import { userSubscriptionsTable, subscriptionTiersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function migrateUsersToStandardTier() {
  const standardTier = await db
    .select()
    .from(subscriptionTiersTable)
    .where(eq(subscriptionTiersTable.level, 1));

  if (standardTier.length === 0) {
    console.error("Standard tier (level 1) not found in subscription_tiers table.");
    process.exit(1);
  }

  const freeTier = await db
    .select()
    .from(subscriptionTiersTable)
    .where(eq(subscriptionTiersTable.level, 0));

  if (freeTier.length === 0) {
    console.log("Free tier not found — nothing to migrate.");
    return;
  }

  const result = await db
    .update(userSubscriptionsTable)
    .set({ tierId: standardTier[0].id })
    .where(eq(userSubscriptionsTable.tierId, freeTier[0].id))
    .returning();

  console.log(`Migrated ${result.length} user subscription(s) from Free (level 0) to Standard (level 1).`);
}

migrateUsersToStandardTier()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
