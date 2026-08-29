import { NextRequest, NextResponse } from "next/server";

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

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

async function scrapeImagesFromHtml(html: string): Promise<string[]> {
  const imageUrls = new Set<string>();

  const isValidImageUrl = (u: string): boolean => {
    if (!u || !u.startsWith("http")) return false;
    const lower = u.toLowerCase();
    const skip = ["sprite", "pixel", "play-icon", "icon", "logo", "badge", "placeholder", "spinner", "loading", "arrow", "chevron", "close", "search", "menu", "footer", "header-icon", "payment", "ssl", "trust", "seal", "google.com", "googleapis.com"];
    if (skip.some((s) => lower.includes(s))) return false;
    return true;
  };

  // 1. JSON-LD structured data
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const json = JSON.parse(jsonLdMatch[1]);
      const extractFromJsonLd = (obj: Record<string, unknown>) => {
        if (!obj || typeof obj !== "object") return;
        if (obj["@type"] === "Product" || obj["@type"] === "IndividualProduct") {
          const img = obj.image;
          if (typeof img === "string" && isValidImageUrl(img)) imageUrls.add(img);
          if (Array.isArray(img)) {
            for (const i of img) {
              const s = typeof i === "string" ? i : String((i as Record<string, unknown>).url || "");
              if (isValidImageUrl(s)) imageUrls.add(s);
            }
          }
          const offers = obj.offers as Record<string, unknown> | undefined;
          if (offers?.image) {
            const oi = typeof offers.image === "string" ? offers.image : "";
            if (isValidImageUrl(oi)) imageUrls.add(oi);
          }
        }
        if (Array.isArray(obj["@graph"])) {
          for (const item of obj["@graph"]) extractFromJsonLd(item as Record<string, unknown>);
        }
        for (const key of Object.keys(obj)) {
          if (Array.isArray(obj[key])) {
            for (const item of obj[key]) {
              if (item && typeof item === "object") extractFromJsonLd(item as Record<string, unknown>);
            }
          } else if (obj[key] && typeof obj[key] === "object") {
            extractFromJsonLd(obj[key] as Record<string, unknown>);
          }
        }
      };
      extractFromJsonLd(json);
    } catch {}
  }

  // 2. Meta tags
  const metaPatterns = [
    /property=["']og:image["']\s+content=["'](https?:\/\/[^"']+)/gi,
    /content=["'](https?:\/\/[^"']+).*?property=["']og:image/gi,
    /name=["']twitter:image["']\s+content=["'](https?:\/\/[^"']+)/gi,
    /content=["'](https?:\/\/[^"']+).*?name=["']twitter:image/gi,
    /property=["']og:image:secure_url["']\s+content=["'](https?:\/\/[^"']+)/gi,
    /name=["']msapplication-TileImage["']\s+content=["'](https?:\/\/[^"']+)/gi,
  ];
  for (const pat of metaPatterns) {
    let m;
    while ((m = pat.exec(html)) !== null) {
      if (isValidImageUrl(m[1])) imageUrls.add(m[1]);
    }
  }

  // 3. Amazon-specific JSON
  const amazonPatterns = [
    /"hiRes":"(https?:\/\/[^"]+)"/g,
    /"large":"(https?:\/\/[^"]+)"/g,
    /"largeImage":"(https?:\/\/[^"]+)"/g,
    /"mainImage":"(https?:\/\/[^"]+)"/g,
    /"image":"(https?:\/\/[^"]+)"/g,
    /data-old-hires="(https?:\/\/[^"]+)"/g,
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9]+(?:\._[A-Z]+)?\.(?:jpg|png|webp)/g,
  ];
  for (const pat of amazonPatterns) {
    let m;
    while ((m = pat.exec(html)) !== null) {
      const imgUrl = m[1] || m[0];
      if (isValidImageUrl(imgUrl)) imageUrls.add(imgUrl);
    }
  }

  // 4. Generic image patterns (src, data-src, srcset)
  const genericPatterns = [
    /<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)/gi,
    /<img[^>]+data-src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)/gi,
    /<img[^>]+srcset=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)/gi,
    /<source[^>]+srcset=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)/gi,
    /data-lazy-src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)/gi,
    /data-image=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)/gi,
    /"thumbnailUrl":"(https?:\/\/[^"]+)"/g,
    /"contentUrl":"(https?:\/\/[^"]+)"/g,
    /"imageUrl":"(https?:\/\/[^"]+)"/g,
  ];
  for (const pat of genericPatterns) {
    let m;
    while ((m = pat.exec(html)) !== null) {
      const imgUrl = m[1] || m[0];
      if (isValidImageUrl(imgUrl)) imageUrls.add(imgUrl);
    }
  }

  // 5. Gallery/carousel containers
  const galleryPatterns = [
    /class=["'][^"']*(?:gallery|carousel|slider|product-images|product-gallery|thumbnails)[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=["'](https?:\/\/[^"']+)/gi,
    /class=["'][^"']*(?:gallery|carousel|slider|product-images|product-gallery|thumbnails)[^"']*["'][^>]*>[\s\S]*?data-src=["'](https?:\/\/[^"']+)/gi,
  ];
  for (const pat of galleryPatterns) {
    let m;
    while ((m = pat.exec(html)) !== null) {
      const imgUrl = m[1] || m[0];
      if (isValidImageUrl(imgUrl)) imageUrls.add(imgUrl);
    }
  }

  // Filter tiny images
  return [...imageUrls].filter((u) => {
    try {
      const parsed = new URL(u);
      const sizeMatch = parsed.search.match(/[?&](?:w|width|h|height|size)=(\d+)/i);
      if (sizeMatch && parseInt(sizeMatch[1]) < 100) return false;
      return true;
    } catch {
      return true;
    }
  });
}

async function scrapeViaScraperAPI(url: string): Promise<string[]> {
  if (!SCRAPER_API_KEY) return [];

  try {
    const params = new URLSearchParams({
      api_key: SCRAPER_API_KEY,
      url,
      render: "true",
    });
    const res = await fetch(`https://api.scraperapi.com?${params}`, {
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return [];
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return [];
    const html = await res.text();
    return await scrapeImagesFromHtml(html);
  } catch {
    return [];
  }
}

async function scrapeDirect(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
      },
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });
    if (!res.ok) return [];
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return [];
    const html = await res.text();
    return await scrapeImagesFromHtml(html);
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

      // Amazon fallback: try ScraperAPI then direct fetch
      if (url) {
        const images = await scrapeViaScraperAPI(url);
        if (images.length > 0) {
          return NextResponse.json({ images });
        }
        const directImages = await scrapeDirect(url);
        if (directImages.length > 0) {
          return NextResponse.json({ images: directImages });
        }
      }
    }

    // ALL other platforms: try ScraperAPI (renders JS), then direct fetch
    if (url) {
      const scraperImages = await scrapeViaScraperAPI(url);
      if (scraperImages.length > 0) {
        return NextResponse.json({ images: scraperImages });
      }

      const directImages = await scrapeDirect(url);
      if (directImages.length > 0) {
        return NextResponse.json({ images: directImages });
      }
    }

    return NextResponse.json({ images: [], error: "Unable to fetch images" }, { status: 400 });
  } catch {
    return NextResponse.json({ images: [], error: "Failed to fetch product images" }, { status: 500 });
  }
}
