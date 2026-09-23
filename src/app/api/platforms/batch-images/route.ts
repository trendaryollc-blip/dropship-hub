import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { assertSafeUrl, fetchValidatedHtml } from "@/lib/safe-url";

async function fetchOgImage(rawUrl: string): Promise<string | null> {
  const result = await fetchValidatedHtml(rawUrl, AbortSignal.timeout(8000));
  if (!result) return null;

  const res = result.response;
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
      const imageSafe = await assertSafeUrl(ogMatch[1]);
      return imageSafe;
    }
  }

  reader.cancel();
  return null;
}

export const POST = withAuth(async (request: NextRequest, _uid: string) => {
  try {
    const { urls } = await request.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ images: [] });
    }

    const limited = urls
      .filter((u): u is string => typeof u === "string" && u.length < 2048)
      .slice(0, 20);

    const results = await Promise.allSettled(
      limited.map((url: string) => fetchOgImage(url))
    );

    const images = results.map((r) =>
      r.status === "fulfilled" ? r.value : null
    );

    // Echo the resolved urls so clients can match images by URL instead of
    // relying on positional alignment of the `images` array.
    return NextResponse.json({ urls: limited, images });
  } catch {
    return NextResponse.json({ images: [] }, { status: 500 });
  }
}, LIMITS.DEFAULT);