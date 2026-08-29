import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getAllPlatforms } from "@/lib/platform-config";

export async function POST(request: NextRequest) {
  const uid = await verifyAuth(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platformId } = await request.json();
  const platforms = await getAllPlatforms();
  const targets = platformId
    ? platforms.filter((p) => p.id === platformId)
    : platforms.filter((p) => p.enabled);

  const results = [];

  for (const platform of targets) {
    const key = platform.keys[0];
    if (!key) {
      results.push({ id: platform.id, name: platform.name, status: "no_key", error: "No API key configured" });
      continue;
    }

    try {
      const testRes = await fetch(`${new URL(request.url).origin}/api/platforms/admin/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: request.headers.get("Authorization") || "" },
        body: JSON.stringify({ platformId: platform.id, keyId: key.id, key: key.key, method: platform.method }),
      });
      const data = await testRes.json();
      results.push({
        id: platform.id,
        name: platform.name,
        method: platform.method,
        keyLabel: key.label,
        keyPreview: key.key.slice(0, 12) + "...",
        status: data.success ? "ok" : "error",
        message: data.message,
      });
    } catch (error) {
      results.push({
        id: platform.id,
        name: platform.name,
        status: "error",
        message: error instanceof Error ? error.message : "Test failed",
      });
    }
  }

  return NextResponse.json({ results });
}
