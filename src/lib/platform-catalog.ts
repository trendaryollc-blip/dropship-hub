// Curated catalog of popular dropshipping / product-data platforms.
// Method 1 of the 3-way platform connecting plan: the owner picks a platform,
// pastes a key, hits "Connect". Each entry maps to a known search method/source
// so the platform can be searched once connected.

export type CatalogMethod = "official_api" | "rainforest" | "serpapi" | "scraperapi" | "custom_scraper";

export interface CatalogPlatform {
  id: string;
  name: string;
  method: CatalogMethod;
  siteKey?: string; // when method === "scraperapi", maps to a built-in scraperSearchConfigs entry
  category: "Dropshipping" | "Marketplace" | "Search Supplier";
  description: string;
  keyHint: string;
  keyUrl: string; // direct link to the platform's API key / developer page
}

export const PLATFORM_CATALOG: CatalogPlatform[] = [
  {
    id: "aliexpress",
    name: "AliExpress",
    method: "scraperapi",
    category: "Dropshipping",
    description: "One of the largest global retail marketplaces, a top dropshipping source.",
    keyHint: "ScraperAPI key (scrapes aliexpress.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "cj",
    name: "CJ Dropshipping",
    method: "official_api",
    category: "Dropshipping",
    description: "End-to-end dropshipping supplier with official API product search.",
    keyHint: "CJ Dropshipping API key (CJ_API_KEY).",
    keyUrl: "https://developers.cjdropshipping.com/",
  },
  {
    id: "temu",
    name: "Temu",
    method: "scraperapi",
    category: "Dropshipping",
    description: "Bargain marketplace from PDD Holdings trending in dropshipping.",
    keyHint: "ScraperAPI key (scrapes temu.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "shein",
    name: "Shein",
    method: "scraperapi",
    category: "Dropshipping",
    description: "Fast-fashion powerhouse, popular for low-cost trending items.",
    keyHint: "ScraperAPI key (scrapes us.shein.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "wish",
    name: "Wish",
    method: "scraperapi",
    siteKey: "wish",
    category: "Dropshipping",
    description: "Budget mobile-first marketplace with a large catalog.",
    keyHint: "ScraperAPI key (scrapes wish.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "banggood",
    name: "Banggood",
    method: "scraperapi",
    category: "Dropshipping",
    description: "Global retailer offering a wide range of gadgets and goods.",
    keyHint: "ScraperAPI key (scrapes banggood.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "dhgate",
    name: "DHgate",
    method: "scraperapi",
    category: "Dropshipping",
    description: "Chinese wholesale marketplace with supplier-direct shipping.",
    keyHint: "ScraperAPI key (scrapes dhgate.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "1688",
    name: "1688 (China Wholesale)",
    method: "scraperapi",
    siteKey: "cn_1688",
    category: "Dropshipping",
    description: "Alibaba Group's domestic Chinese wholesale marketplace.",
    keyHint: "ScraperAPI key (scrapes 1688.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "alibaba",
    name: "Alibaba",
    method: "scraperapi",
    category: "Search Supplier",
    description: "Global B2B wholesale platform, great for bulk sourcing.",
    keyHint: "ScraperAPI key (scrapes alibaba.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "amazon",
    name: "Amazon",
    method: "rainforest",
    category: "Marketplace",
    description: "World's largest marketplace queried via Rainforest API.",
    keyHint: "Rainforest API key (RAINFOREST_API_KEY).",
    keyUrl: "https://www.rainforestapi.com/",
  },
  {
    id: "ebay",
    name: "eBay",
    method: "scraperapi",
    siteKey: "ebay",
    category: "Marketplace",
    description: "Auction and buy-it-now marketplace with huge volume.",
    keyHint: "ScraperAPI key (scrapes ebay.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "etsy",
    name: "Etsy",
    method: "scraperapi",
    category: "Marketplace",
    description: "Handmade, vintage, and craft supplies marketplace.",
    keyHint: "ScraperAPI key (scrapes etsy.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "walmart",
    name: "Walmart",
    method: "scraperapi",
    category: "Marketplace",
    description: "Retail giant's marketplace — big US audience.",
    keyHint: "ScraperAPI key (scrapes walmart.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "shopee",
    name: "Shopee",
    method: "scraperapi",
    siteKey: "shopee",
    category: "Marketplace",
    description: "Leading Southeast Asian and Taiwan e-commerce platform.",
    keyHint: "ScraperAPI key (scrapes shopee.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "global_sources",
    name: "Global Sources",
    method: "scraperapi",
    siteKey: "global_sources",
    category: "Search Supplier",
    description: "B2B sourcing platform with verified suppliers.",
    keyHint: "ScraperAPI key (scrapes globalsources.com search results).",
    keyUrl: "https://www.scraperapi.com/",
  },
  {
    id: "zendrop",
    name: "Zendrop",
    method: "custom_scraper",
    category: "Dropshipping",
    description: "Dropshipping platform with curated trending products.",
    keyHint: "Paste a product search page URL in the No-Code Connector for best results.",
    keyUrl: "https://app.zendrop.com/",
  },
  {
    id: "spocket",
    name: "Spocket",
    method: "custom_scraper",
    category: "Dropshipping",
    description: "US/EU-based dropshipping supplier directory.",
    keyHint: "Paste a product search page URL in the No-Code Connector for best results.",
    keyUrl: "https://app.spocket.co/",
  },
];

export const CATALOG_METHOD_LABELS: Record<CatalogMethod, string> = {
  official_api: "Official API",
  rainforest: "Rainforest API",
  serpapi: "SerpAPI",
  scraperapi: "Scraper (Web)",
  custom_scraper: "Custom",
};

export function getCatalogPlatform(id: string): CatalogPlatform | undefined {
  return PLATFORM_CATALOG.find((p) => p.id === id);
}
