import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isOwner } from "@/lib/auth";
import { createPlatform, getAllPlatforms, deletePlatform, type PlatformInput } from "@/lib/platform-config";
import { logger } from "@/lib/logger";

const SEED_PLATFORMS: PlatformInput[] = [
  {
    name: "CJ Dropshipping",
    slug: "cj",
    method: "official_api",
    enabled: true,
    apiKey: process.env.CJ_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 100,
  },
  {
    name: "Amazon",
    slug: "amazon",
    method: "rainforest",
    enabled: true,
    apiKey: process.env.RAINFOREST_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 100,
  },
  {
    name: "Google Shopping",
    slug: "google_shopping",
    method: "serpapi",
    enabled: true,
    apiKey: process.env.SERP_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 100,
  },
  {
    name: "Keepa",
    slug: "keepa",
    method: "official_api",
    enabled: true,
    apiKey: process.env.KEEPA_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 100,
  },
  {
    name: "AliExpress",
    slug: "aliexpress",
    method: "scraperapi",
    enabled: true,
    apiKey: process.env.SCRAPER_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 5000,
  },
  {
    name: "Walmart",
    slug: "walmart",
    method: "scraperapi",
    enabled: false,
    apiKey: process.env.SCRAPER_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 5000,
  },
  {
    name: "Etsy",
    slug: "etsy",
    method: "scraperapi",
    enabled: false,
    apiKey: process.env.SCRAPER_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 5000,
  },
  {
    name: "Temu",
    slug: "temu",
    method: "scraperapi",
    enabled: false,
    apiKey: process.env.SCRAPER_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 5000,
  },
  {
    name: "Shein",
    slug: "shein",
    method: "scraperapi",
    enabled: false,
    apiKey: process.env.SCRAPER_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 5000,
  },
  {
    name: "Banggood",
    slug: "banggood",
    method: "scraperapi",
    enabled: false,
    apiKey: process.env.SCRAPER_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 5000,
  },
  {
    name: "DHgate",
    slug: "dhgate",
    method: "scraperapi",
    enabled: false,
    apiKey: process.env.SCRAPER_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 5000,
  },
  {
    name: "Alibaba",
    slug: "alibaba",
    method: "scraperapi",
    enabled: false,
    apiKey: process.env.SCRAPER_API_KEY || "",
    keyLabel: "Primary",
    requestsLimit: 5000,
  },
];

// POST — seed initial platforms from env vars
export async function POST(request: NextRequest) {
  const uid = await verifyAuth(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isOwner(uid))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const reset = searchParams.get("reset") === "true";

    // Check if platforms already exist
    const existing = await getAllPlatforms();

    // If reset, delete all existing platforms first
    if (reset && existing.length > 0) {
      for (const p of existing) {
        await deletePlatform(p.id);
      }
    }

    const existingIds = new Set(
      (reset ? [] : existing).map((p) => p.id)
    );

    const created = [];
    const skipped = [];

    for (const input of SEED_PLATFORMS) {
      const id = input.slug || input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      if (existingIds.has(id)) {
        skipped.push(input.name);
        continue;
      }

      try {
        await createPlatform(input);
        created.push(input.name);
      } catch (error) {
        logger.error(`Failed to seed ${input.name}`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      message: `Created ${created.length} platforms, skipped ${skipped.length} (already exist)`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seed failed" },
      { status: 500 }
    );
  }
}
