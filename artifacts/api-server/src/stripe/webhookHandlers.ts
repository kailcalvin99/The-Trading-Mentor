import { getStripeSync } from "./stripeClient";
import { db, subscriptionTiersTable, userSubscriptionsTable, usersTable, adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Received type: " + typeof payload + ". " +
        "FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const event = JSON.parse(payload.toString());
    await WebhookHandlers.handleEvent(event);
  }

  static async handleEvent(event: any): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed":
        await WebhookHandlers.handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.deleted":
        await WebhookHandlers.handleSubscriptionDeleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await WebhookHandlers.handleSubscriptionUpdated(event.data.object);
        break;
    }
  }

  static async handleCheckoutCompleted(session: any): Promise<void> {
    const userId = parseInt(session.metadata?.userId, 10);
    const tierId = parseInt(session.metadata?.tierId, 10);
    const billingCycle = session.metadata?.billingCycle || "monthly";

    if (!userId || !tierId) {
      console.warn("Stripe webhook: missing userId or tierId in session metadata");
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      console.warn("Stripe webhook: user not found:", userId);
      return;
    }

    const founderDiscountMonthsSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "founder_discount_months"));
    const founderDiscountMonths = founderDiscountMonthsSetting.length > 0 ? parseInt(founderDiscountMonthsSetting[0].value) : 6;

    const subData = {
      tierId,
      status: "active" as const,
      billingCycle,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      stripeCheckoutSessionId: session.id,
      founderDiscount: user.isFounder,
      founderDiscountEndsAt: user.isFounder ? new Date(Date.now() + founderDiscountMonths * 30 * 24 * 60 * 60 * 1000) : null,
      startDate: new Date(),
    };

    const existingSub = await db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.userId, userId));

    if (existingSub.length > 0) {
      await db.update(userSubscriptionsTable)
        .set(subData)
        .where(eq(userSubscriptionsTable.userId, userId));
    } else {
      await db.insert(userSubscriptionsTable).values({
        userId,
        ...subData,
      });
    }

    console.log(`Stripe: User ${userId} upgraded to tier ${tierId} (${billingCycle})`);
  }

  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    const existingSub = await db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.stripeCustomerId, customerId));

    if (existingSub.length > 0) {
      const [freeTier] = await db.select().from(subscriptionTiersTable).where(eq(subscriptionTiersTable.level, 0));
      if (freeTier) {
        await db.update(userSubscriptionsTable)
          .set({
            tierId: freeTier.id,
            status: "active",
            stripeSubscriptionId: null,
            stripeCheckoutSessionId: null,
            founderDiscount: false,
            founderDiscountEndsAt: null,
          })
          .where(eq(userSubscriptionsTable.stripeCustomerId, customerId));
        console.log(`Stripe: Customer ${customerId} subscription deleted, reset to Free`);
      }
    }
  }

  static async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const customerId = subscription.customer;
    const existingSub = await db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.stripeCustomerId, customerId));

    if (existingSub.length > 0) {
      const newStatus = subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : subscription.status;
      await db.update(userSubscriptionsTable)
        .set({ status: newStatus })
        .where(eq(userSubscriptionsTable.stripeCustomerId, customerId));
    }
  }
}
