// ── AI Intent Parser ──────────────────────────────────────────────────────
//
// Parses natural language product search queries into structured search
// filters. Supports both rule-based (fast, local) and AI-powered parsing.

// ── Types ──────────────────────────────────────────────────────────────────

export interface ParsedIntent {
  keywords: string[];
  priceMin?: number;
  priceMax?: number;
  categories?: string[];
  platforms?: string[];
  sortBy?: "price" | "rating" | "reviews" | "trending" | "margin";
  minRating?: number;
  minReviews?: number;
  brand?: string;
  trending?: boolean;
  freeShipping?: boolean;
  originalQuery: string;
  confidence: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PLATFORM_ALIASES: Record<string, string> = {
  amazon: "amazon",
  amzn: "amazon",
  eb: "ebay",
  ebay: "ebay",
  ali: "aliexpress",
  aliexpress: "aliexpress",
  alibaba: "alibaba",
  walmart: "walmart",
  wm: "walmart",
  etsy: "etsy",
  temu: "temu",
  shein: "shein",
  banggood: "banggood",
  dhgate: "dhgate",
  cj: "cj",
  "cj dropshipping": "cj",
  google: "google_shopping",
  "google shopping": "google_shopping",
  "1688": "1688",
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  electronics: ["electronic", "electronics", "gadget", "tech", "device", "bluetooth", "wifi", "wireless", "usb", "led", "speaker", "headphone", "earbuds", "charger", "cable", "adapter"],
  fashion: ["fashion", "clothing", "clothes", "shirt", "dress", "pants", "shoes", "sneakers", "boots", "jacket", "coat", "hat", "cap", "bag", "purse", "watch", "jewelry", "necklace", "ring", "bracelet"],
  home: ["home", "kitchen", "bathroom", "bedroom", "living room", "furniture", "decor", "decoration", "lamp", "pillow", "blanket", "curtain", "rug", "mat"],
  beauty: ["beauty", "makeup", "cosmetic", "skincare", "skin care", "moisturizer", "serum", "shampoo", "conditioner", "perfume", "cologne"],
  pet: ["pet", "dog", "cat", "puppy", "kitten", "aquarium", "fish", "bird", "hamster", "pet supplies", "pet accessories"],
  fitness: ["fitness", "exercise", "gym", "workout", "yoga", "running", "sports", "athletic", "gloves", "mat", "dumbbell", "resistance"],
  toys: ["toy", "toys", "game", "games", "puzzle", "figure", "doll", "lego", "building", "blocks", "remote control", " rc "],
  automotive: ["car", "auto", "automotive", "vehicle", "truck", "suv", "motorcycle", "bike", "dashboard", "mount", "holder"],
  baby: ["baby", "infant", "toddler", "stroller", "crib", "diaper", "bottle", "pacifier", "nursery"],
  garden: ["garden", "outdoor", "plant", "pot", "flower", "lawn", "patio", "umbrella", "grill", "barbecue"],
};

const FILLER_WORDS = new Set([
  "the", "a", "an", "for", "with", "and", "or", "to", "in", "on", "at",
  "by", "of", "is", "it", "that", "this", "from", "but", "not", "be",
  "as", "was", "are", "were", "has", "have", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "can", "shall",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "they",
  "find", "search", "look", "looking", "want", "need", "get", "show",
  "me", "some", "best", "good", "great", "top", "popular", "nice",
]);

// ── Rule-Based Intent Parser ──────────────────────────────────────────────

export function parseIntentLocally(query: string): ParsedIntent {
  if (!query || query.trim().length === 0) {
    return { keywords: [], originalQuery: query, confidence: 0 };
  }

  let remaining = query.trim();
  const intent: ParsedIntent = {
    keywords: [],
    originalQuery: query,
    confidence: 0.5,
  };

  // Extract price constraints
  const priceRangeMatch = remaining.match(/\$(\d+(?:\.\d+)?)\s*(?:to|-)\s*\$(\d+(?:\.\d+)?)/i);
  if (priceRangeMatch) {
    intent.priceMin = parseFloat(priceRangeMatch[1]);
    intent.priceMax = parseFloat(priceRangeMatch[2]);
    remaining = remaining.replace(priceRangeMatch[0], " ");
  } else {
    const underMatch = remaining.match(/(?:under|below|less than|max|up to|cheapest)\s*\$?(\d+(?:\.\d+)?)/i);
    if (underMatch) {
      intent.priceMax = parseFloat(underMatch[1]);
      remaining = remaining.replace(underMatch[0], " ");
    }

    const overMatch = remaining.match(/(?:over|above|more than|minimum|min)\s*\$?(\d+(?:\.\d+)?)/i);
    if (overMatch) {
      intent.priceMin = parseFloat(overMatch[1]);
      remaining = remaining.replace(overMatch[0], " ");
    }
  }

  if (!intent.priceMax && /\bcheap\b|\bbudget\b|\baffordable\b/i.test(remaining)) {
    intent.priceMax = 20;
    remaining = remaining.replace(/\b(?:cheap|budget|affordable)\b/gi, " ");
  }
  if (!intent.priceMin && /\bpremium\b|\bluxury\b|\bexpensive\b|\bhigh.end\b/i.test(remaining)) {
    intent.priceMin = 50;
    remaining = remaining.replace(/\b(?:premium|luxury|expensive|high.end)\b/gi, " ");
  }

  // Extract rating requirements
  const ratingMatch = remaining.match(/(\d(?:\.\d)?)\s*\+?\s*(?:stars?|rating|rated)/i);
  if (ratingMatch) {
    intent.minRating = parseFloat(ratingMatch[1]);
    remaining = remaining.replace(ratingMatch[0], " ");
  } else if (/\bhighly?\s*rated\b|\bbest\s*reviewed\b|\btop\s*rated\b/i.test(remaining)) {
    intent.minRating = 4;
    remaining = remaining.replace(/\b(?:highly?\s*rated|best\s*reviewed|top\s*rated)\b/gi, " ");
  }

  // Extract review count requirements
  const reviewMatch = remaining.match(/(\d+)\s*\+?\s*(?:reviews?|ratings?)/i);
  if (reviewMatch) {
    intent.minReviews = parseInt(reviewMatch[1], 10);
    remaining = remaining.replace(reviewMatch[0], " ");
  }

  // Extract platforms
  const foundPlatforms: string[] = [];
  for (const [alias, platform] of Object.entries(PLATFORM_ALIASES)) {
    const platformRegex = new RegExp(`\\b(?:on|from|at|via)\\s+${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (platformRegex.test(remaining)) {
      if (!foundPlatforms.includes(platform)) foundPlatforms.push(platform);
      remaining = remaining.replace(platformRegex, " ");
    }
  }
  if (foundPlatforms.length > 0) intent.platforms = foundPlatforms;

  // Extract sorting preference
  if (/\bcheapest\b|\blowest\s*price\b|\bprice\s*(?:low|asc)/i.test(remaining)) {
    intent.sortBy = "price";
    remaining = remaining.replace(/\b(?:cheapest|lowest\s*price|price\s*(?:low|asc))\b/gi, " ");
  } else if (/\bbest\s*rated\b|\btop\s*rated\b|\bhighest\s*rated\b/i.test(remaining)) {
    intent.sortBy = "rating";
    remaining = remaining.replace(/\b(?:best\s*rated|top\s*rated|highest\s*rated)\b/gi, " ");
  } else if (/\bmost\s*reviewed\b|\bmost\s*popular\b/i.test(remaining)) {
    intent.sortBy = "reviews";
    remaining = remaining.replace(/\b(?:most\s*reviewed|most\s*popular)\b/gi, " ");
  } else if (/\btrending\b|\bhot\b|\brising\b/i.test(remaining)) {
    intent.sortBy = "trending";
    intent.trending = true;
    remaining = remaining.replace(/\b(?:trending|hot|rising)\b/gi, " ");
  } else if (/\bhigh\s*margin\b|\bbest\s*margin\b|\bmost\s*profitable\b/i.test(remaining)) {
    intent.sortBy = "margin";
    remaining = remaining.replace(/\b(?:high\s*margin|best\s*margin|most\s*profitable)\b/gi, " ");
  }

  // Extract boolean flags
  if (/\bfree\s*shipping\b/i.test(remaining)) {
    intent.freeShipping = true;
    remaining = remaining.replace(/\bfree\s*shipping\b/gi, " ");
  }

  // Extract categories
  const lowerRemaining = remaining.toLowerCase();
  const foundCategories: string[] = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lowerRemaining.includes(kw)) {
        foundCategories.push(category);
        break;
      }
    }
  }
  if (foundCategories.length > 0) intent.categories = foundCategories;

  // Extract brand (capitalized word that isn't a filler)
  const words = remaining.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (/^[A-Z][a-z]+/.test(word) && !FILLER_WORDS.has(word.toLowerCase())) {
      intent.brand = word;
      break;
    }
  }

  // Extract remaining keywords
  intent.keywords = remaining
    .split(/\s+/)
    .filter((w) => w.length > 1 && !FILLER_WORDS.has(w.toLowerCase()))
    .map((w) => w.toLowerCase());

  // Calculate confidence
  let factors = 0;
  if (intent.priceMin != null || intent.priceMax != null) factors++;
  if (intent.minRating != null) factors++;
  if (intent.platforms && intent.platforms.length > 0) factors++;
  if (intent.sortBy) factors++;
  if (intent.categories && intent.categories.length > 0) factors++;
  if (intent.brand) factors++;
  if (intent.keywords.length >= 2) factors++;

  intent.confidence = Math.min(1, 0.3 + factors * 0.1);

  return intent;
}

// ── AI-Powered Intent Parser ──────────────────────────────────────────────

export async function parseIntentWithAI(
  query: string,
  aiCallFn: (prompt: string) => Promise<string>
): Promise<ParsedIntent> {
  if (!query || query.trim().length < 3) {
    return parseIntentLocally(query);
  }

  try {
    const prompt = `Parse this product search query into structured JSON. Return ONLY valid JSON with these fields:
- keywords: string[] (search terms)
- priceMin: number | null
- priceMax: number | null
- categories: string[] (from: electronics, fashion, home, beauty, pet, fitness, toys, automotive, baby, garden)
- platforms: string[] (from: amazon, ebay, aliexpress, walmart, etsy, cj, google_shopping, temu, shein, alibaba, banggood, dhgate, 1688)
- sortBy: "price" | "rating" | "reviews" | "trending" | "margin" | null
- minRating: number | null
- minReviews: number | null
- brand: string | null
- trending: boolean
- freeShipping: boolean

Query: "${query}"`;

    const response = await aiCallFn(prompt);
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      priceMin: typeof parsed.priceMin === "number" ? parsed.priceMin : undefined,
      priceMax: typeof parsed.priceMax === "number" ? parsed.priceMax : undefined,
      categories: Array.isArray(parsed.categories) ? parsed.categories : undefined,
      platforms: Array.isArray(parsed.platforms) ? parsed.platforms : undefined,
      sortBy: parsed.sortBy || undefined,
      minRating: typeof parsed.minRating === "number" ? parsed.minRating : undefined,
      minReviews: typeof parsed.minReviews === "number" ? parsed.minReviews : undefined,
      brand: typeof parsed.brand === "string" ? parsed.brand : undefined,
      trending: Boolean(parsed.trending),
      freeShipping: Boolean(parsed.freeShipping),
      originalQuery: query,
      confidence: 0.9,
    };
  } catch {
    return parseIntentLocally(query);
  }
}

// ── Search Keyword Builder ────────────────────────────────────────────────

export function buildSearchKeywords(intent: ParsedIntent): string[] {
  const stopWords = new Set([
    "cheap", "budget", "affordable", "premium", "luxury", "expensive",
    "trending", "hot", "rising", "best", "good", "great", "top",
    "under", "below", "over", "above", "free", "shipping",
    "stars", "rating", "rated", "reviews", "reviewed",
    "price", "low", "high", "margin", "profitable",
  ]);

  const keywords = intent.keywords.filter((k) => !stopWords.has(k) && k.length > 1);

  if (intent.brand) {
    keywords.unshift(intent.brand);
  }

  if (intent.categories && intent.categories.length > 0) {
    for (const cat of intent.categories) {
      if (!keywords.some((k) => k.includes(cat) || cat.includes(k))) {
        keywords.push(cat);
      }
    }
  }

  return keywords.length > 0 ? keywords : [intent.originalQuery];
}

// ── Filter Mapper ──────────────────────────────────────────────────────────

export interface SearchFilters {
  brands: string[];
  priceMin: string;
  priceMax: string;
  minRating: number;
  minMargin: number;
  competitionLevel: ("low" | "medium" | "high")[];
  trendingDirection: ("rising" | "stable" | "declining")[];
  platformFilter: string[];
}

export function applyIntentToFilters(intent: ParsedIntent, existing?: SearchFilters): SearchFilters {
  const base: SearchFilters = existing || {
    brands: [],
    priceMin: "",
    priceMax: "",
    minRating: 0,
    minMargin: 0,
    competitionLevel: [],
    trendingDirection: [],
    platformFilter: [],
  };

  return {
    ...base,
    brands: intent.brand ? [...new Set([...base.brands, intent.brand])] : base.brands,
    priceMin: intent.priceMin != null ? String(intent.priceMin) : base.priceMin,
    priceMax: intent.priceMax != null ? String(intent.priceMax) : base.priceMax,
    minRating: intent.minRating != null ? Math.max(base.minRating, intent.minRating) : base.minRating,
    platformFilter: intent.platforms && intent.platforms.length > 0
      ? [...new Set([...base.platformFilter, ...intent.platforms])]
      : base.platformFilter,
    trendingDirection: intent.trending
      ? ["rising" as const, ...base.trendingDirection.filter((d) => d !== "rising")]
      : base.trendingDirection,
  };
}
