import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";

const SETTINGS_DOC = "system/settings";

interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  defaultTier: string;
  maxFreeAiCalls: number;
  maxFreeSearches: number;
  allowedFreeProviders: string[];
}

const DEFAULT_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  registrationEnabled: true,
  defaultTier: "free",
  maxFreeAiCalls: 50,
  maxFreeSearches: 20,
  allowedFreeProviders: ["groq", "gemini", "huggingface"],
};

export const GET = requireOwner(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const doc = await db.collection("system").doc("settings").get();
    const settings = doc.exists ? { ...DEFAULT_SETTINGS, ...doc.data() } : DEFAULT_SETTINGS;

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[AdminSettings] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch settings" },
      { status: 500 }
    );
  }
});

export const POST = requireOwner(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: "settings object is required" }, { status: 400 });
    }

    // Merge with defaults to ensure all fields exist
    const merged = { ...DEFAULT_SETTINGS, ...settings, updatedAt: new Date().toISOString() };

    await db.collection("system").doc("settings").set(merged, { merge: true });

    return NextResponse.json({ success: true, settings: merged });
  } catch (error) {
    console.error("[AdminSettings] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save settings" },
      { status: 500 }
    );
  }
});
