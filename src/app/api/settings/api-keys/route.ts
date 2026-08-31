import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

function maskKey(key: string): string {
  if (!key || key.length <= 8) return "••••••••";
  return "••••" + key.slice(-4);
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("settings").doc("apiKeys").get();
    const data = snap.exists ? snap.data() : {};

    const masked: Record<string, { masked: string; configured: boolean }> = {};
    const providers = [
      "groq", "gemini", "openai", "anthropic", "deepseek",
      "mistral", "cohere", "together", "fireworks", "openrouter",
      "huggingface", "hpc",
    ];

    for (const p of providers) {
      const val = (data as Record<string, string>)[p];
      masked[p] = { masked: val ? maskKey(val) : "", configured: !!val };
    }

    return NextResponse.json({ keys: masked });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { provider, key } = body;

    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ error: "provider string required" }, { status: 400 });
    }
    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "key string required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("settings").doc("apiKeys");
    await docRef.set({ [provider]: key }, { merge: true });

    return NextResponse.json({ success: true, masked: maskKey(key) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { provider } = body;

    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ error: "provider string required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("settings").doc("apiKeys");
    await docRef.set({ [provider]: null }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}, LIMITS.DEFAULT);
