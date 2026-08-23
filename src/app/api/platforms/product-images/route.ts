import { NextRequest, NextResponse } from "next/server";

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;

async function getAmazonProductImages(asin: string) {
  const params = new URLSearchParams({
    api_key: RAINFOREST_API_KEY!,
    type: "product",
    amazon_domain: "amazon.com",
    asin: asin,
    include_clause: "product(title,image,images)",
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Rainforest API ${res.status}`);
  return res.json();
}

async function getProductImagesFromUrl(url: string) {
  const params = new URLSearchParams({
    api_key: RAINFOREST_API_KEY!,
    type: "product",
    amazon_domain: "amazon.com",
    url: url,
    include_clause: "product(title,image,images)",
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Rainforest API ${res.status}`);
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { asin, url, source } = await request.json();

    if (source === "amazon" || source === "google_shopping") {
      if (asin) {
        const data = await getAmazonProductImages(asin);
        const product = data.product || {};
        const primaryImage = String(product.image || "");
        const additionalImages = Array.isArray(product.images)
          ? (product.images as unknown[]).map((img: unknown) => {
              if (typeof img === "string") return img;
              if (typeof img === "object" && img !== null) {
                const imgObj = img as Record<string, unknown>;
                return String(imgObj.url || imgObj.large || imgObj.high_res || "");
              }
              return "";
            }).filter((u: string) => u && u !== "null" && u !== "")
          : [];
        const allImages = [primaryImage, ...additionalImages].filter((u: string) => u && u !== "null" && u !== "");
        return NextResponse.json({ images: allImages, title: String(product.title || "") });
      }

      if (url) {
        const data = await getProductImagesFromUrl(url);
        const product = data.product || {};
        const primaryImage = String(product.image || "");
        const additionalImages = Array.isArray(product.images)
          ? (product.images as unknown[]).map((img: unknown) => {
              if (typeof img === "string") return img;
              if (typeof img === "object" && img !== null) {
                const imgObj = img as Record<string, unknown>;
                return String(imgObj.url || imgObj.large || imgObj.high_res || "");
              }
              return "";
            }).filter((u: string) => u && u !== "null" && u !== "")
          : [];
        const allImages = [primaryImage, ...additionalImages].filter((u: string) => u && u !== "null" && u !== "");
        return NextResponse.json({ images: allImages, title: String(product.title || "") });
      }
    }

    return NextResponse.json({ images: [], error: "Unable to fetch images for this source" }, { status: 400 });
  } catch {
    return NextResponse.json({ images: [], error: "Failed to fetch product images" }, { status: 500 });
  }
}
