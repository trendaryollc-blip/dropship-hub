import { NextRequest, NextResponse } from "next/server";

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;

function extractImageUrls(data: Record<string, unknown>): string[] {
  const product = (data.product || data) as Record<string, unknown>;
  const primary = String(product.image || product.mainImage || "");
  const results: string[] = [];

  if (primary && primary.startsWith("http")) results.push(primary);

  const imagesField = product.images || product.imagesAll || product.allImages;
  if (Array.isArray(imagesField)) {
    for (const img of imagesField) {
      if (typeof img === "string" && img.startsWith("http")) {
        results.push(img);
      } else if (typeof img === "object" && img !== null) {
        const o = img as Record<string, unknown>;
        const url = String(o.link || o.url || o.large || o.high_res || o.hi_res || o.largeUrl || "");
        if (url && url.startsWith("http")) results.push(url);
      }
    }
  }

  const variantImages = product.variant_images || product.additionalImages;
  if (Array.isArray(variantImages)) {
    for (const img of variantImages) {
      if (typeof img === "string" && img.startsWith("http")) results.push(img);
      else if (typeof img === "object" && img !== null) {
        const o = img as Record<string, unknown>;
        const url = String(o.link || o.url || o.large || "");
        if (url && url.startsWith("http")) results.push(url);
      }
    }
  }

  return [...new Set(results)].filter((u) => u && !u.includes("sprite") && !u.includes("pixel"));
}

async function fetchViaRainforestByUrl(url: string): Promise<string[]> {
  if (!RAINFOREST_API_KEY) return [];

  const includeVariants = [
    "product(title,image,images)",
    "product(title,image,images,variations)",
    "product.images",
    "product.images.large",
  ];

  for (const clause of includeVariants) {
    try {
      const params = new URLSearchParams({
        api_key: RAINFOREST_API_KEY,
        type: "product",
        amazon_domain: "amazon.com",
        url,
        include_clause: clause,
      });
      const res = await fetch(`https://api.rainforestapi.com/request?${params}`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const images = extractImageUrls(data);
      if (images.length > 1) return images;
    } catch {
      continue;
    }
  }

  return [];
}

async function fetchViaRainforestByAsin(asin: string): Promise<string[]> {
  if (!RAINFOREST_API_KEY) return [];

  const includeVariants = [
    "product(title,image,images)",
    "product(title,image,images,variations)",
    "product.images",
    "product.images.large",
  ];

  for (const clause of includeVariants) {
    try {
      const params = new URLSearchParams({
        api_key: RAINFOREST_API_KEY,
        type: "product",
        amazon_domain: "amazon.com",
        asin,
        include_clause: clause,
      });
      const res = await fetch(`https://api.rainforestapi.com/request?${params}`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const images = extractImageUrls(data);
      if (images.length > 1) return images;
    } catch {
      continue;
    }
  }

  return [];
}

async function scrapeImagesFromPage(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    if (!res.ok) return [];
    const html = await res.text();
    const baseUrl = new URL(url);

    const imageUrls = new Set<string>();

    const patterns = [
      /"hiRes":"(https?:\/\/[^"]+)"/g,
      /"large":"(https?:\/\/[^"]+)"/g,
      /"largeImage":"(https?:\/\/[^"]+)"/g,
      /"mainImage":"(https?:\/\/[^"]+)"/g,
      /"image":"(https?:\/\/[^"]+)"/g,
      /data-old-hires="(https?:\/\/[^"]+)"/g,
      /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9]+(?:\._[A-Z]+)?\.(?:jpg|png|webp)/g,
      /property=["']og:image["']\s+content=["'](https?:\/\/[^"']+)/gi,
      /content=["'](https?:\/\/[^"']+).*?property=["']og:image/gi,
      /class=["'][^"']*(?:gallery|carousel|product)[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=["'](https?:\/\/[^"']+)/gi,
      /<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)/gi,
      /"thumbnailUrl":"(https?:\/\/[^"]+)"/g,
      /"contentUrl":"(https?:\/\/[^"]+)"/g,
    ];

    for (const pat of patterns) {
      let match;
      while ((match = pat.exec(html)) !== null) {
        const imgUrl = match[1] || match[0];
        if (imgUrl && imgUrl.startsWith("http") && !imgUrl.includes("sprite") && !imgUrl.includes("pixel") && !imgUrl.includes("play-icon") && !imgUrl.includes("icon") && !imgUrl.includes("logo") && !imgUrl.includes("badge")) {
          try {
            const parsed = new URL(imgUrl);
            if (parsed.hostname !== baseUrl.hostname && !parsed.hostname.includes("cdn") && !parsed.hostname.includes("image") && parsed.pathname.split("/").pop()?.includes(".")) {
              imageUrls.add(imgUrl);
            } else if (parsed.hostname === baseUrl.hostname) {
              imageUrls.add(imgUrl);
            }
          } catch {
            imageUrls.add(imgUrl);
          }
        }
      }
    }

    return [...imageUrls];
  } catch {
    return [];
  }
}

function extractAsin(url: string): string {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/ASIN\/([A-Z0-9]{10})/i,
    /asin[=\/]([A-Z0-9]{10})/i,
    /\/ap\/([A-Z0-9]{10})/i,
  ];
  for (const pat of patterns) {
    const m = url.match(pat);
    if (m) return m[1];
  }
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const { asin, url, source } = await request.json();

    if (source === "amazon") {
      const extractedAsin = asin || (url ? extractAsin(url) : "");

      if (extractedAsin) {
        const images = await fetchViaRainforestByAsin(extractedAsin);
        if (images.length > 0) {
          return NextResponse.json({ images });
        }
      }

      if (url) {
        const images = await fetchViaRainforestByUrl(url);
        if (images.length > 0) {
          return NextResponse.json({ images });
        }
      }

      if (url) {
        const images = await scrapeImagesFromPage(url);
        if (images.length > 0) {
          return NextResponse.json({ images });
        }
      }
    }

    if (source === "google_shopping" && url) {
      const images = await scrapeImagesFromPage(url);
      if (images.length > 0) {
        return NextResponse.json({ images });
      }
    }

    return NextResponse.json({ images: [], error: "Unable to fetch images for this source" }, { status: 400 });
  } catch {
    return NextResponse.json({ images: [], error: "Failed to fetch product images" }, { status: 500 });
  }
}
