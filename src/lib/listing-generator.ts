import type { PlatformType, ProductInput, ListingGenerationRequest, ListingGenerationResponse, GeneratedListing, PlatformListingConfig } from "@/types/product-listing";

export const PLATFORM_CONFIGS: Record<PlatformType, PlatformListingConfig> = {
  amazon: {
    platform: "amazon",
    maxLengths: { title: 200, description: 2000, bulletPoints: 5, bulletPointLength: 500 },
    requirements: { bulletPoints: 5, seoTags: true, backendKeywords: true, storyDescription: false },
  },
  shopify: {
    platform: "shopify",
    maxLengths: { title: 70, description: 5000, bulletPoints: 4, bulletPointLength: 300 },
    requirements: { bulletPoints: 4, seoTags: true, backendKeywords: false, storyDescription: true },
  },
  etsy: {
    platform: "etsy",
    maxLengths: { title: 140, description: 4000, bulletPoints: 3, bulletPointLength: 400 },
    requirements: { bulletPoints: 3, seoTags: true, backendKeywords: false, storyDescription: true },
  },
  ebay: {
    platform: "ebay",
    maxLengths: { title: 80, description: 4000, bulletPoints: 4, bulletPointLength: 300 },
    requirements: { bulletPoints: 4, seoTags: false, backendKeywords: false, storyDescription: false },
  },
  walmart: {
    platform: "walmart",
    maxLengths: { title: 75, description: 4000, bulletPoints: 5, bulletPointLength: 400 },
    requirements: { bulletPoints: 5, seoTags: true, backendKeywords: true, storyDescription: false },
  },
};

export function getPlatformConfig(platform: PlatformType): PlatformListingConfig {
  return PLATFORM_CONFIGS[platform];
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

function extractKeywords(title: string, description: string, category: string): string[] {
  const combined = `${title} ${description} ${category}`.toLowerCase();
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "is", "it", "that", "this", "was", "are", "be", "has", "had", "have", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "not", "no", "yes", "if", "then", "else", "when", "where", "how", "what", "which", "who", "whom", "whose", "why", "all", "each", "every", "both", "few", "more", "most", "other", "some", "such", "than", "too", "very", "just", "about", "above", "after", "again", "also", "any", "because", "before", "being", "between", "come", "day", "even", "first", "get", "give", "go", "here", "high", "its", "know", "last", "let", "like", "long", "look", "made", "make", "many", "may", "new", "now", "old", "one", "our", "out", "over", "own", "part", "put", "see", "set", "she", "so", "still", "take", "tell", "their", "them", "there", "these", "they", "thing", "think", "time", "two", "use", "want", "way", "well", "work", "your"]);
  const words = combined.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stopWords.has(w));
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w]) => w);
}

function generateSEOTags(title: string, category: string, keywords: string[], platform: PlatformType): string[] {
  const tags: string[] = [];
  const categoryWords = category.split(/[^a-z0-9]+/i).filter((w) => w.length > 2);
  tags.push(...categoryWords.map((w) => w.toLowerCase()));

  const titleWords = title.split(/[^a-z0-9]+/i).filter((w) => w.length > 3);
  tags.push(...titleWords.slice(0, 5).map((w) => w.toLowerCase()));

  tags.push(...keywords.slice(0, 10));

  const unique = [...new Set(tags)];
  if (platform === "etsy") return unique.slice(0, 13);
  if (platform === "amazon") return unique.slice(0, 25);
  return unique.slice(0, 15);
}

function generateBackendKeywords(title: string, keywords: string[], category: string): string[] {
  const backend: string[] = [];
  backend.push(...keywords.slice(0, 15));
  const categoryParts = category.split(/[^a-z0-9]+/i).filter((w) => w.length > 2);
  backend.push(...categoryParts.map((w) => w.toLowerCase()));
  const titleParts = title.split(/[^a-z0-9]+/i).filter((w) => w.length > 3 && !backend.includes(w.toLowerCase()));
  backend.push(...titleParts.slice(0, 5).map((w) => w.toLowerCase()));
  return [...new Set(backend)].slice(0, 250);
}

function buildAmazonTitle(product: ProductInput, keywords: string[]): string {
  const brand = product.supplierName || "";
  const keyFeatures = keywords.slice(0, 3).join(" ");
  let title = product.title;
  if (brand && !title.toLowerCase().includes(brand.toLowerCase())) {
    title = `${brand} ${title}`;
  }
  if (keyFeatures && !title.toLowerCase().includes(keyFeatures.toLowerCase())) {
    title = `${title} - ${keyFeatures}`;
  }
  return truncate(title, 200);
}

function buildShopifyTitle(product: ProductInput, _keywords: string[]): string {
  return truncate(product.title, 70);
}

function buildEtsyTitle(product: ProductInput, keywords: string[]): string {
  const gift = "Gift";
  const hasGift = product.title.toLowerCase().includes("gift") || keywords.includes("gift");
  let title = product.title;
  if (!hasGift) {
    title = `${title}, ${gift}`;
  }
  return truncate(title, 140);
}

function buildEbayTitle(product: ProductInput, _keywords: string[]): string {
  return truncate(product.title, 80);
}

function buildWalmartTitle(product: ProductInput, keywords: string[]): string {
  const brand = product.supplierName || "";
  let title = product.title;
  if (brand && !title.toLowerCase().includes(brand.toLowerCase())) {
    title = `${brand} ${title}`;
  }
  return truncate(title, 75);
}

function generateTitle(product: ProductInput, platform: PlatformType, keywords: string[]): string {
  switch (platform) {
    case "amazon": return buildAmazonTitle(product, keywords);
    case "shopify": return buildShopifyTitle(product, keywords);
    case "etsy": return buildEtsyTitle(product, keywords);
    case "ebay": return buildEbayTitle(product, keywords);
    case "walmart": return buildWalmartTitle(product, keywords);
  }
}

function generateDescription(product: ProductInput, platform: PlatformType, keywords: string[]): string {
  const config = PLATFORM_CONFIGS[platform];
  const baseDesc = product.description;
  const specs = Object.entries(product.specifications)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  let description = "";
  if (platform === "shopify" || platform === "etsy") {
    description = `${baseDesc}\n\nKey Features:\n${specs}\n\n${keywords.slice(0, 5).join(" | ")}`;
  } else {
    const bulletPoints = Object.entries(product.specifications)
      .slice(0, 5)
      .map(([k, v]) => `• ${k}: ${v}`)
      .join("\n");
    description = `${baseDesc}\n\n${bulletPoints}`;
  }

  return truncate(description, config.maxLengths.description);
}

function generateBulletPoints(product: ProductInput, platform: PlatformType, keywords: string[]): string[] {
  const config = PLATFORM_CONFIGS[platform];
  const count = config.requirements.bulletPoints;
  const maxLen = config.maxLengths.bulletPointLength;
  const bullets: string[] = [];
  const specs = Object.entries(product.specifications);

  for (let i = 0; i < count && i < specs.length; i++) {
    const [key, val] = specs[i];
    bullets.push(truncate(`${key}: ${val}`, maxLen));
  }

  while (bullets.length < count) {
    const kw = keywords[bullets.length] || "high quality";
    bullets.push(truncate(`Premium ${kw} - designed for durability and performance`, maxLen));
  }

  return bullets;
}

function generateStoryDescription(product: ProductInput, _keywords: string[]): string {
  let story = product.description;
  if (product.supplierName) {
    story += `\n\nSourced from ${product.supplierName}, this ${product.category.toLowerCase()} is crafted with attention to detail.`;
  }
  story += "\n\nEach item is carefully inspected before shipping to ensure it meets our quality standards.";
  story += "\n\nOrder with confidence - we offer hassle-free returns and dedicated customer support.";
  return truncate(story, 2000);
}

function calculateOptimizationScore(listing: {
  title: string;
  description: string;
  bulletPoints: string[];
  seoTags: string[];
  backendKeywords?: string[];
}, config: PlatformListingConfig): number {
  let score = 0;
  if (listing.title.length > 30) score += 20;
  else if (listing.title.length > 15) score += 10;

  if (listing.description.length > 200) score += 25;
  else if (listing.description.length > 100) score += 15;

  if (listing.bulletPoints.length >= config.requirements.bulletPoints) score += 20;
  else score += (listing.bulletPoints.length / config.requirements.bulletPoints) * 20;

  if (config.requirements.seoTags && listing.seoTags.length >= 5) score += 15;
  else if (config.requirements.seoTags) score += (listing.seoTags.length / 5) * 15;

  if (config.requirements.backendKeywords && listing.backendKeywords && listing.backendKeywords.length >= 10) score += 20;
  else if (config.requirements.backendKeywords) score += ((listing.backendKeywords?.length || 0) / 10) * 20;

  return Math.min(100, Math.round(score));
}

export function generateListing(request: ListingGenerationRequest): ListingGenerationResponse {
  const startTime = Date.now();
  const { product, platform } = request;
  const config = PLATFORM_CONFIGS[platform];
  const keywords = extractKeywords(product.title, product.description, product.category);

  const title = generateTitle(product, platform, keywords);
  const description = generateDescription(product, platform, keywords);
  const bulletPoints = generateBulletPoints(product, platform, keywords);
  const seoTags = generateSEOTags(title, product.category, keywords, platform);
  const backendKeywords = config.requirements.backendKeywords
    ? generateBackendKeywords(title, keywords, product.category)
    : undefined;
  const storyDescription = config.requirements.storyDescription
    ? generateStoryDescription(product, keywords)
    : undefined;

  const listing: GeneratedListing = {
    id: `listing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    platform,
    title,
    description,
    bulletPoints,
    seoTags,
    backendKeywords,
    storyDescription,
    characterCounts: {
      title: title.length,
      description: description.length,
    },
    optimizationScore: calculateOptimizationScore(
      { title, description, bulletPoints, seoTags, backendKeywords },
      config
    ),
    generatedAt: new Date().toISOString(),
  };

  const keywordSuggestions = keywords.slice(0, 10).map((kw) => ({
    keyword: kw,
    volume: Math.floor(Math.random() * 10000) + 1000 + " monthly",
    competition: Math.random() > 0.6 ? "high" : Math.random() > 0.3 ? "medium" : "low",
  }));

  const alternatives = [
    {
      title: truncate(`${product.title} - Premium Quality ${keywords[0] || ""}`, config.maxLengths.title),
      description: truncate(product.description, config.maxLengths.description),
      bulletPoints: bulletPoints.map((b) => truncate(b.replace(/^.*?:/, "Premium:"), config.maxLengths.bulletPointLength)),
    },
  ];

  return {
    listing,
    alternatives,
    keywordSuggestions,
    generationTime: Date.now() - startTime,
    provider: "listing-engine",
  };
}

export function validateListingForPlatform(listing: GeneratedListing): { valid: boolean; errors: string[] } {
  const config = PLATFORM_CONFIGS[listing.platform];
  const errors: string[] = [];

  if (listing.title.length > config.maxLengths.title) {
    errors.push(`Title exceeds ${config.maxLengths.title} character limit (${listing.title.length})`);
  }
  if (listing.description.length > config.maxLengths.description) {
    errors.push(`Description exceeds ${config.maxLengths.description} character limit (${listing.description.length})`);
  }
  if (listing.bulletPoints.length < config.requirements.bulletPoints) {
    errors.push(`Need ${config.requirements.bulletPoints} bullet points, got ${listing.bulletPoints.length}`);
  }
  for (let i = 0; i < listing.bulletPoints.length; i++) {
    if (listing.bulletPoints[i].length > config.maxLengths.bulletPointLength) {
      errors.push(`Bullet point ${i + 1} exceeds ${config.maxLengths.bulletPointLength} characters`);
    }
  }
  if (config.requirements.seoTags && listing.seoTags.length === 0) {
    errors.push("SEO tags required for this platform");
  }

  return { valid: errors.length === 0, errors };
}
