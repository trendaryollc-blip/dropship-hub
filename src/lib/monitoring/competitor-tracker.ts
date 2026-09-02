import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { withRetry } from "./retry";
import type { CompetitorSnapshot } from "./types";

async function scrapeCompetitorPrice(url: string): Promise<CompetitorSnapshot> {
  const scraperKey = process.env.SCRAPER_API_KEY;
  const snapshot: CompetitorSnapshot = { url, price: null, inStock: true, scrapedAt: new Date().toISOString() };

  if (!scraperKey) return snapshot;

  try {
    const params = new URLSearchParams({ api_key: scraperKey, url, render: "true" });
    const res = await fetch(`https://api.scraperapi.com?${params}`, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return snapshot;

    const html = await res.text();
    const priceMatch = html.match(/\$[\d,]+\.?\d*/);
    snapshot.price = priceMatch ? parseFloat(priceMatch[0].replace(/[$,]/g, "")) : null;
    if (snapshot.price !== null && isNaN(snapshot.price)) snapshot.price = null;

    const outOfStockPatterns = /out of stock|sold out|unavailable|currently unavailable/i;
    snapshot.inStock = !outOfStockPatterns.test(html);
  } catch {
    // Keep defaults
  }

  return snapshot;
}

export async function trackCompetitorPrices(
  uid: string,
  monitoredId: string,
  competitorUrls: string[]
): Promise<CompetitorSnapshot[]> {
  if (competitorUrls.length === 0) return [];

  const results: CompetitorSnapshot[] = [];

  for (const url of competitorUrls) {
    try {
      const snapshot = await withRetry(() => scrapeCompetitorPrice(url));
      results.push(snapshot);
    } catch (err) {
      logger.error("Competitor scrape failed", {
        uid,
        monitoredId,
        url,
        error: err instanceof Error ? err.message : String(err),
      });
      results.push({ url, price: null, inStock: true, scrapedAt: new Date().toISOString() });
    }
  }

  try {
    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("monitoredProducts").doc(monitoredId);
    await docRef.update({ competitorSnapshots: results }).catch(() => {});
  } catch {
    // Non-critical
  }

  return results;
}

export function findCompetitorUndercuts(
  ourPrice: number,
  snapshots: CompetitorSnapshot[]
): CompetitorSnapshot[] {
  return snapshots.filter((s) => s.price !== null && s.price < ourPrice && s.inStock);
}

export async function checkAndAlertCompetitorUndercuts(
  uid: string,
  monitoredId: string,
  productTitle: string,
  ourPrice: number,
  competitorUrls: string[]
): Promise<number> {
  if (competitorUrls.length === 0 || ourPrice <= 0) return 0;

  const snapshots = await trackCompetitorPrices(uid, monitoredId, competitorUrls);
  const undercuts = findCompetitorUndercuts(ourPrice, snapshots);

  if (undercuts.length === 0) return 0;

  try {
    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("monitoredProducts").doc(monitoredId);
    const doc = await docRef.get();

    if (!doc.exists) return 0;

    const existingAlerts = doc.data()?.alerts || [];
    const now = new Date().toISOString();

    const newAlerts = undercuts.map((u, i) => ({
      id: `competitor-${now}-${i}`,
      type: "competitor_undercut" as const,
      message: `Competitor at ${new URL(u.url).hostname} has lower price: $${u.price!.toFixed(2)} vs your $${ourPrice.toFixed(2)}`,
      newPrice: u.price!,
      createdAt: now,
      read: false,
    }));

    await docRef.update({ alerts: [...existingAlerts, ...newAlerts] });
    return newAlerts.length;
  } catch (err) {
    logger.error("Failed to save competitor alerts", { uid, monitoredId, error: err instanceof Error ? err.message : String(err) });
    return 0;
  }
}
