import { NextRequest, NextResponse } from "next/server";

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let chunk = "";
    let totalBytes = 0;
    const maxBytes = 32768;

    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunk += decoder.decode(value, { stream: true });
      totalBytes += value.byteLength;

      const ogMatch = chunk.match(/property=["']og:image["']\s+content=["'](https?:\/\/[^"']+)/i)
        || chunk.match(/content=["'](https?:\/\/[^"']+).*?property=["']og:image/i)
        || chunk.match(/name=["']twitter:image["']\s+content=["'](https?:\/\/[^"']+)/i)
        || chunk.match(/"image":"(https?:\/\/[^"]+)"/)
        || chunk.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)/i);

      if (ogMatch) {
        reader.cancel();
        return ogMatch[1];
      }
    }

    reader.cancel();
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ images: [] });
    }

    const limited = urls.slice(0, 20);
    const results = await Promise.allSettled(
      limited.map((url: string) => fetchOgImage(url))
    );

    const images = results.map((r) =>
      r.status === "fulfilled" ? r.value : null
    );

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] }, { status: 500 });
  }
}
