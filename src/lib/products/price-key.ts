export interface ProductPricePoint {
  date: string;
  prices: Record<string, number>;
}

/** Stable Firestore-safe key for a viewed product. */
export function productPriceKey(title: string, category?: string): string {
  const base = `${title}::${category ?? ""}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
  }
  const slug = base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "product"}-${Math.abs(hash).toString(36)}`;
}

/** Collapse stored points into a per-platform {date, price} series. */
export function seriesForPlatform(history: ProductPricePoint[], platform: string): Array<{ date: string; price: number }> {
  return history
    .filter((p) => typeof p.prices?.[platform] === "number")
    .map((p) => ({ date: p.date, price: p.prices[platform] }));
}
