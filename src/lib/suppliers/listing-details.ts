// ── Best-effort listing detail extraction ─────────────────────────────────
//
// Search-result markup sometimes states a minimum order quantity, a shipping
// window, or how long a store has traded. We extract these ONLY from explicit
// phrasings so we never invent a value; anything ambiguous stays undefined
// (rendered as "—" by the UI). Deliberately conservative: a wrong number is
// worse than no number.

export interface ListingDetails {
  /** Minimum order quantity, when stated explicitly (e.g. "MOQ: 10"). */
  moq?: number;
  /**
   * Upper bound of a stated shipping window in days (e.g. "Ships in 3-7 days"
   * → 7). Stored as the worst case so the buyer plans for the slow end.
   */
  shippingDays?: number;
  /** Whole years trading, derived only from an explicit "since YYYY". */
  yearsInBusiness?: number;
}

const MOQ_PATTERNS: RegExp[] = [
  /\bmoq\b[^0-9]{0,12}(\d{1,6})/i,
  /\bmin(?:imum)?\.?\s*(?:order|quantity|qty)\b[^0-9]{0,12}(\d{1,6})/i,
  /\border\s*(?:at\s*least|from)\s*(\d{1,6})/i,
];

const SHIPPING_RANGE_PATTERNS: RegExp[] = [
  /\bships?\s*(?:within|in)\s*(\d{1,3})\s*(?:-\s*(\d{1,3}))?\s*days?/i,
  /\bdelivery\s*(?:in|within)?\s*(\d{1,3})\s*(?:-\s*(\d{1,3}))?\s*days?/i,
  /\b(\d{1,3})\s*-\s*(\d{1,3})\s*days?\s*(?:shipping|delivery|to ship|dispatch)/i,
];

const ESTABLISHED_PATTERN = /\b(?:since|established(?:\s+in)?|founded(?:\s+in)?)\s*((?:19|20)\d{2})\b/i;

function boundedInt(raw: string, min: number, max: number): number | undefined {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < min || value > max) return undefined;
  return value;
}

export function extractMoq(text: string): number | undefined {
  for (const pattern of MOQ_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const value = boundedInt(match[1], 1, 1_000_000);
      if (value !== undefined) return value;
    }
  }
  return undefined;
}

export function extractShippingDays(text: string): number | undefined {
  for (const pattern of SHIPPING_RANGE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const upper = match[2] ?? match[1];
      const value = boundedInt(upper, 1, 365);
      if (value !== undefined) return value;
    }
  }
  return undefined;
}

export function extractYearsInBusiness(
  text: string,
  referenceYear = new Date().getFullYear()
): number | undefined {
  const match = ESTABLISHED_PATTERN.exec(text);
  if (!match) return undefined;
  const year = boundedInt(match[1], 1800, referenceYear);
  if (year === undefined) return undefined;
  const years = referenceYear - year;
  return years >= 0 && years <= 200 ? years : undefined;
}

export function parseListingDetails(
  text: string,
  referenceYear?: number
): ListingDetails {
  const details: ListingDetails = {};
  const moq = extractMoq(text);
  if (moq !== undefined) details.moq = moq;
  const shippingDays = extractShippingDays(text);
  if (shippingDays !== undefined) details.shippingDays = shippingDays;
  const years = extractYearsInBusiness(text, referenceYear);
  if (years !== undefined) details.yearsInBusiness = years;
  return details;
}
