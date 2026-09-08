import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

function maskKey(key: string): string {
  if (!key || key.length <= 8) return "••••••••";
  return "••••" + key.slice(-4);
}

function ensureKeyArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? v : ""));
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("settings").doc("apiKeys").get();
    const data = snap.exists ? snap.data() : {};

    const masked: Record<string, { keys: Array<{ masked: string; index: number }>; configured: boolean }> = {};
    const providers = [
      "groq", "gemini", "openai", "deepseek",
      "mistral", "cohere", "together", "fireworks", "openrouter",
      "huggingface", "hpc",
    ];

    for (const p of providers) {
      const rawValue = (data as Record<string, unknown>)[p];
      const keys = ensureKeyArray(rawValue);
      const configured = keys.length > 0;
      
      masked[p] = {
        keys: keys.map((k, idx) => ({ masked: maskKey(k), index: idx })),
        configured,
      };
    }

    return NextResponse.json({ keys: masked });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { provider, key, action, index } = body;

    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ error: "provider string required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("settings").doc("apiKeys");
    
    // Get existing keys or start fresh
    const snap = await docRef.get();
    const data = snap.exists ? snap.data() : {};
    const existingKeys = ensureKeyArray(data?.[provider]);

    // Handle adding an empty key slot (for the "Add Another Key" feature)
    if (action === "addEmptySlot") {
      existingKeys.push("");
      await docRef.set({ [provider]: existingKeys }, { merge: true });
      return NextResponse.json({ success: true, keys: existingKeys });
    }

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "key string required" }, { status: 400 });
    }

    // If an index is provided, update that specific slot (for additional key saves)
    if (typeof index === "number" && index >= 0) {
      // Extend array if needed
      while (existingKeys.length <= index) {
        existingKeys.push("");
      }
      existingKeys[index] = key.trim();
      await docRef.set({ [provider]: existingKeys }, { merge: true });
      return NextResponse.json({ success: true, masked: maskKey(key) });
    }

    // Default: append new key (avoid duplicates)
    if (!existingKeys.includes(key.trim())) {
      existingKeys.push(key.trim());
    }
    
    await docRef.set({ [provider]: existingKeys }, { merge: true });

    return NextResponse.json({ success: true, masked: maskKey(key) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { provider, index } = body;

    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ error: "provider string required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("settings").doc("apiKeys");

    const snap = await docRef.get();
    const data = snap.exists ? snap.data() : {};
    const existingKeys = ensureKeyArray(data?.[provider]);
    
    if (index !== undefined && index >= 0 && index < existingKeys.length) {
      // Remove specific key by index
      existingKeys.splice(index, 1);
    } else {
      // Remove all keys for this provider (legacy behavior)
      existingKeys.length = 0;
    }
    
    await docRef.set({ [provider]: existingKeys.length > 0 ? existingKeys : null }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}, LIMITS.DEFAULT);
