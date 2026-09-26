import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { rateLimitGlobal, LIMITS } from "@/lib/rate-limit";
import { validateBody, SubscribeInputSchema } from "@/lib/validation";
import { smartSendEmail } from "@/lib/email/smart-sender";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  // Public endpoint (email capture on the marketing site) — per-IP global limit.
  const rl = await rateLimitGlobal(request, LIMITS.AUTH);
  if (!rl.allowed) return rl.response!;

  try {
    const raw = await request.json();
    if (raw && typeof raw.email === "string") raw.email = raw.email.trim();
    const parseResult = validateBody(SubscribeInputSchema, raw);
    if (!parseResult.success) return parseResult.response;
    const { email, source, website } = parseResult.data;

    // Honeypot: pretend success, store nothing.
    if (website && website.trim() !== "") {
      return NextResponse.json({ success: true });
    }

    const normalized = email.trim().toLowerCase();
    const db = await getAdminDB();
    if (!db) {
      return NextResponse.json({ success: false, error: "Subscriptions are not available right now" }, { status: 503 });
    }

    const leads = db.collection("leads");
    const existing = await leads.where("email", "==", normalized).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }

    await leads.add({
      email: normalized,
      source: source || "landing",
      createdAt: new Date().toISOString(),
    });

    // Best-effort welcome email — the lead is stored even if no provider is
    // configured (honest success: you are on the list either way).
    void smartSendEmail({
      to: normalized,
      subject: "You're on the DropShip Hub list",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="color:#111">You're on the list 🎉</h2>
          <p style="color:#444">Thanks for signing up for DropShip Hub updates. We'll email you when we ship something worth your time — product drops, new tools, and growth tactics for dropshippers.</p>
          <p style="color:#444">In the meantime, <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sign-up">create your free account</a> and start finding winning products today.</p>
          <p style="color:#999;font-size:12px">DropShip Hub · trendaryo.com</p>
        </div>`,
    }).catch((err) => {
      logger.warn("[subscribe] welcome email failed", { error: err instanceof Error ? err.message : String(err) });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[subscribe] failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: "Subscription failed" }, { status: 500 });
  }
}
