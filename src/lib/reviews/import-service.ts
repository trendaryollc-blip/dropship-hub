import Papa from "papaparse";
import { PublicError } from "@/lib/api-errors";
import { withKeyPool } from "@/lib/api-keys/pool";

/**
 * Review import sources that work today: CSV upload (zero config) and Amazon
 * via Rainforest (RAINFOREST_API_KEY). Everything here either returns real
 * rows or throws an honest error — never fabricated reviews.
 */

export interface ImportedReviewRow {
  author: string;
  rating: number;
  title: string;
  content: string;
  images: string[];
  verified: boolean;
  sourceReviewId?: string;
}

export interface CsvParseResult {
  rows: ImportedReviewRow[];
  totalFound: number;
  skipped: number;
}

const MAX_CSV_CHARS = 400_000;

const RATING_KEYS = ["rating", "stars", "score", "star"];
const AUTHOR_KEYS = ["author", "name", "reviewer", "customer"];
const TITLE_KEYS = ["title", "headline", "summary"];
const CONTENT_KEYS = ["content", "review", "body", "comment", "text", "reviewtext"];
const VERIFIED_KEYS = ["verified", "verifiedpurchase", "isverified"];
const IMAGE_KEYS = ["images", "image", "photos", "photo", "imageurls", "imageurl"];
const ID_KEYS = ["reviewid", "sourceid", "id"];

function normKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickField(normalized: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = normalized[key];
    if (value) return value;
  }
  return "";
}

function mapRecord(record: Record<string, unknown>): ImportedReviewRow | null {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) continue;
    normalized[normKey(key)] = String(value).trim();
  }

  const ratingRaw = pickField(normalized, RATING_KEYS);
  if (!ratingRaw) return null;
  const rating = Math.round(Number(ratingRaw.replace(",", ".")));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;

  const content = pickField(normalized, CONTENT_KEYS);
  if (!content) return null;

  const imageField = pickField(normalized, IMAGE_KEYS);
  const images = imageField
    ? imageField
        .split(/[\s|;,]+/)
        .filter((url) => /^https?:\/\//i.test(url))
        .slice(0, 5)
    : [];

  const sourceReviewId = pickField(normalized, ID_KEYS);
  return {
    author: pickField(normalized, AUTHOR_KEYS) || "Customer",
    rating,
    title: pickField(normalized, TITLE_KEYS),
    content,
    images,
    verified: /^(true|yes|y|1)$/i.test(pickField(normalized, VERIFIED_KEYS)),
    sourceReviewId: sourceReviewId || undefined,
  };
}

export function parseReviewsCsv(csvText: string, maxReviews: number): CsvParseResult {
  if (!csvText || !csvText.trim()) {
    throw new PublicError("The CSV file is empty.");
  }
  if (csvText.length > MAX_CSV_CHARS) {
    throw new PublicError("CSV file is too large (max 400KB) — export fewer reviews and try again.");
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: "greedy",
  });
  const records = parsed.data.filter((row) => row && typeof row === "object");
  if (records.length === 0) {
    throw new PublicError(
      "Couldn't read that CSV — expected a header row such as: rating,author,content."
    );
  }

  const rows: ImportedReviewRow[] = [];
  let skipped = 0;
  for (const record of records) {
    if (rows.length >= maxReviews) {
      skipped++;
      continue;
    }
    const row = mapRecord(record);
    if (row) rows.push(row);
    else skipped++;
  }

  if (rows.length === 0) {
    throw new PublicError(
      "No valid review rows found — each row needs a rating 1–5 and review text (columns like rating, author, content)."
    );
  }
  return { rows, totalFound: records.length, skipped };
}

export function extractAsin(url: string): string {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/ASIN\/([A-Z0-9]{10})/i,
    /asin[=\/]([A-Z0-9]{10})/i,
  ];
  for (const pat of patterns) {
    const m = url.match(pat);
    if (m) return m[1].toUpperCase();
  }
  return "";
}

function imagesFrom(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const urls: string[] = [];
  for (const item of raw.slice(0, 5)) {
    if (typeof item === "string") {
      if (/^https?:\/\//i.test(item)) urls.push(item);
    } else if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const url = String(record.medium ?? record.large ?? record.thumbnail ?? "");
      if (/^https?:\/\//i.test(url)) urls.push(url);
    }
  }
  return urls;
}

function providerError(message: string, status: number): Error {
  const error = new Error(message);
  (error as Error & { status?: number }).status = status;
  return error;
}

/**
 * Fetch real reviews for an Amazon ASIN through Rainforest. Rotates pool keys
 * via withKeyPool; missing keys surface as ConfigMissingError (honest 501).
 */
export async function fetchAmazonReviewRows(
  asin: string,
  maxReviews: number
): Promise<{ rows: ImportedReviewRow[]; totalFound: number }> {
  return withKeyPool("rainforest", async (key) => {
    const params = new URLSearchParams({
      api_key: key,
      type: "reviews",
      amazon_domain: "amazon.com",
      asin,
      include_clause: "reviews(id,title,content,rating,author,date,verified_purchase,images)",
      sort_by: "helpful",
      per_page: String(Math.min(100, Math.max(10, maxReviews))),
    });

    const res = await fetch(`https://api.rainforestapi.com/request?${params}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 401 || res.status === 403) {
      throw providerError(`Rainforest API rejected the key (HTTP ${res.status})`, res.status);
    }
    if (res.status === 429) {
      throw providerError("Rainforest API rate limit reached (HTTP 429)", 429);
    }
    if (!res.ok) {
      throw new PublicError(`Amazon review request failed (HTTP ${res.status}) — try again in a minute.`);
    }

    const data = (await res.json()) as {
      reviews?: Record<string, unknown>[];
      reviews_total?: number;
    };
    const list = Array.isArray(data.reviews) ? data.reviews : [];
    if (list.length === 0) {
      throw new PublicError(
        "No reviews found for that Amazon product — check the URL, or the product may have no reviews yet."
      );
    }

    const rows: ImportedReviewRow[] = [];
    for (const review of list) {
      if (rows.length >= maxReviews) break;
      const content = String(review.content ?? "").trim();
      const rating = Math.round(Number(review.rating ?? 0));
      if (!content || rating < 1 || rating > 5) continue;
      rows.push({
        author: String(review.author ?? "").trim() || "Amazon customer",
        rating,
        title: String(review.title ?? "").trim(),
        content,
        images: imagesFrom(review.images),
        verified: Boolean(review.verified_purchase),
        sourceReviewId: review.id != null ? String(review.id) : undefined,
      });
    }
    if (rows.length === 0) {
      throw new PublicError("That product's reviews couldn't be read — Rainforest returned no usable rows.");
    }

    const totalFound =
      typeof data.reviews_total === "number" && data.reviews_total > 0
        ? data.reviews_total
        : list.length;
    return { rows, totalFound };
  });
}
