import Stripe from "stripe";
import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import type { BillingTier, Subscription, Invoice, UsageMetric } from "./types";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  stripeInstance = new Stripe(key, { apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion });
  return stripeInstance;
}

export async function getOrCreateStripeCustomer(uid: string, email: string): Promise<string> {
  const db = await getAdminDB();
  const userDoc = await db.collection("users").doc(uid).collection("settings").doc("billing").get();

  if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
    return userDoc.data()!.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { uid },
  });

  await db.collection("users").doc(uid).collection("settings").doc("billing").set({
    stripeCustomerId: customer.id,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return customer.id;
}

export async function createCheckoutSession(
  uid: string,
  email: string,
  priceId: string,
  tier: BillingTier,
  interval: "month" | "year"
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(uid, email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings/billing`,
    metadata: { uid, tier, interval },
    subscription_data: {
      metadata: { uid, tier },
    },
  });

  return { sessionId: session.id, url: session.url! };
}

export async function createCustomerPortalSession(uid: string): Promise<{ url: string }> {
  const stripe = getStripe();
  const db = await getAdminDB();
  const userDoc = await db.collection("users").doc(uid).collection("settings").doc("billing").get();

  if (!userDoc.exists || !userDoc.data()?.stripeCustomerId) {
    throw new Error("No Stripe customer found");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: userDoc.data()!.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings/billing`,
  });

  return { url: session.url };
}

export async function handleCheckoutCompleted(checkoutSession: Stripe.Checkout.Session): Promise<void> {
  const uid = checkoutSession.metadata?.uid;
  const tier = checkoutSession.metadata?.tier as BillingTier;
  if (!uid || !tier) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription as string);

  const db = await getAdminDB();
  await db.collection("users").doc(uid).collection("settings").doc("subscription").set({
    uid,
    stripeCustomerId: checkoutSession.customer as string,
    stripeSubscriptionId: subscription.id,
    tier,
    status: subscription.status as string,
    currentPeriodStart: new Date(((subscription as unknown as Record<string, unknown>).current_period_start as number) * 1000).toISOString(),
    currentPeriodEnd: new Date(((subscription as unknown as Record<string, unknown>).current_period_end as number) * 1000).toISOString(),
    cancelAtPeriodEnd: (subscription as unknown as Record<string, unknown>).cancel_at_period_end as boolean,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  logger.info("Subscription created", { uid, tier, subscriptionId: subscription.id });
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const uid = subscription.metadata?.uid;
  if (!uid) return;

  const db = await getAdminDB();
  await db.collection("users").doc(uid).collection("settings").doc("subscription").update({
    status: subscription.status,
    currentPeriodStart: new Date(((subscription as unknown as Record<string, unknown>).current_period_start as number) * 1000).toISOString(),
    currentPeriodEnd: new Date(((subscription as unknown as Record<string, unknown>).current_period_end as number) * 1000).toISOString(),
    cancelAtPeriodEnd: (subscription as unknown as Record<string, unknown>).cancel_at_period_end as boolean,
    updatedAt: new Date().toISOString(),
  });

  logger.info("Subscription updated", { uid, status: subscription.status });
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const uid = subscription.metadata?.uid;
  if (!uid) return;

  const db = await getAdminDB();
  await db.collection("users").doc(uid).collection("settings").doc("subscription").update({
    status: "canceled",
    updatedAt: new Date().toISOString(),
  });

  logger.info("Subscription canceled", { uid });
}

export async function trackUsage(uid: string, metric: UsageMetric, quantity: number = 1): Promise<void> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("usage").add({
      uid,
      metric,
      quantity,
      timestamp: new Date().toISOString(),
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const usageSnap = await db
      .collection("users")
      .doc(uid)
      .collection("usage")
      .where("metric", "==", metric)
      .where("timestamp", ">=", startOfMonth)
      .get();

    const totalUsage = usageSnap.docs.reduce((sum, doc) => sum + (doc.data().quantity || 0), 0);

    await db.collection("users").doc(uid).collection("settings").doc("usage").set({
      [`${metric}Monthly`]: totalUsage,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    logger.error("Failed to track usage", { uid, metric, error: err instanceof Error ? err.message : String(err) });
  }
}

export async function getUsage(uid: string, metric: UsageMetric): Promise<number> {
  try {
    const db = await getAdminDB();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("usage")
      .where("metric", "==", metric)
      .where("timestamp", ">=", startOfMonth)
      .get();

    return snap.docs.reduce((sum, doc) => sum + (doc.data().quantity || 0), 0);
  } catch {
    return 0;
  }
}

export async function getUserSubscription(uid: string): Promise<Subscription | null> {
  try {
    const db = await getAdminDB();
    const doc = await db.collection("users").doc(uid).collection("settings").doc("subscription").get();
    if (!doc.exists) return null;
    return doc.data() as Subscription;
  } catch {
    return null;
  }
}

export async function getUserTier(uid: string): Promise<BillingTier> {
  const sub = await getUserSubscription(uid);
  if (!sub || sub.status !== "active") return "free";
  return sub.tier;
}

export async function createInvoice(uid: string, amount: number, currency: string = "usd"): Promise<Invoice | null> {
  try {
    const stripe = getStripe();
    const db = await getAdminDB();
    const userDoc = await db.collection("users").doc(uid).collection("settings").doc("billing").get();

    if (!userDoc.exists || !userDoc.data()?.stripeCustomerId) return null;

    const invoice = await stripe.invoices.create({
      customer: userDoc.data()!.stripeCustomerId,
      auto_advance: true,
    });

    const invoiceData: Invoice = {
      id: invoice.id,
      uid,
      stripeInvoiceId: invoice.id,
      amount,
      currency,
      status: invoice.status || "draft",
      invoiceUrl: invoice.hosted_invoice_url || "",
      createdAt: new Date().toISOString(),
    };

    await db.collection("users").doc(uid).collection("invoices").add(invoiceData);

    return invoiceData;
  } catch (err) {
    logger.error("Failed to create invoice", { uid, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function getInvoices(uid: string, limit: number = 50): Promise<Invoice[]> {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("invoices")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((doc) => doc.data() as Invoice);
  } catch {
    return [];
  }
}
