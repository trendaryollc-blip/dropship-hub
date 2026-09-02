import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { runPriceCheckForUser } from "@/lib/monitoring/scheduler";
import { computeMonitoringMetrics } from "@/lib/monitoring/metrics";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const job = url.searchParams.get("job") || "price-check";

  logger.info("Cron job triggered", { job });

  try {
    const db = await getAdminDB();
    const usersSnap = await db.collection("users").get();

    if (usersSnap.empty) {
      return NextResponse.json({ message: "No users found", results: [] });
    }

    const results: Array<{ uid: string; result: Awaited<ReturnType<typeof runPriceCheckForUser>> }> = [];

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;

      try {
        if (job === "price-check") {
          const result = await runPriceCheckForUser(uid);
          results.push({ uid, result });
        } else if (job === "metrics") {
          const metrics = await computeMonitoringMetrics(uid);
          await db.collection("users").doc(uid).collection("monitoringMetrics").doc("latest").set({
            ...metrics,
            computedAt: new Date().toISOString(),
          });
          results.push({ uid, result: { checked: 0, priceChanged: 0, stockChanged: 0, alerts: 0, errors: 0 } });
        }
      } catch (err) {
        logger.error("Cron job failed for user", {
          uid,
          job,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const summary = results.reduce(
      (acc, r) => ({
        checked: acc.checked + r.result.checked,
        priceChanged: acc.priceChanged + r.result.priceChanged,
        stockChanged: acc.stockChanged + r.result.stockChanged,
        alerts: acc.alerts + r.result.alerts,
        errors: acc.errors + r.result.errors,
      }),
      { checked: 0, priceChanged: 0, stockChanged: 0, alerts: 0, errors: 0 }
    );

    logger.info("Cron job completed", { job, usersProcessed: results.length, summary });

    return NextResponse.json({
      success: true,
      job,
      usersProcessed: results.length,
      summary,
    });
  } catch (err) {
    logger.error("Cron job failed", { job, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Cron job failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
