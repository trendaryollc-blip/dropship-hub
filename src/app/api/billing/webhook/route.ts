import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/billing/stripe";
import { handleCheckoutCompleted, handleSubscriptionUpdated, handleSubscriptionDeleted } from "@/lib/billing/stripe";
import { logger } from "@/lib/logger";
import Stripe from "stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig || !WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
    }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
    } catch (err) {
      logger.error("Stripe webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_succeeded":
        logger.info("Invoice payment succeeded", { invoiceId: (event.data.object as Stripe.Invoice).id });
        break;
      case "invoice.payment_failed":
        logger.warn("Invoice payment failed", { invoiceId: (event.data.object as Stripe.Invoice).id });
        break;
      default:
        logger.info("Unhandled Stripe event", { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("Stripe webhook error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
