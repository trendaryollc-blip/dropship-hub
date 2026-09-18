import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError } from "@/lib/data/utils";
import { safeErrorMessage } from "@/lib/api-errors";

interface PriceWarSettingsDoc {
  enabled: boolean;
  checkIntervalMinutes: number;
  autoApply: boolean;
  maxDailyAdjustments: number;
  notifyOnAdjustment: boolean;
  notifyOnFloorBreach: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const DEFAULT_SETTINGS: Omit<PriceWarSettingsDoc, "createdAt" | "updatedAt"> = {
  enabled: true,
  checkIntervalMinutes: 60,
  autoApply: true,
  maxDailyAdjustments: 50,
  notifyOnAdjustment: true,
  notifyOnFloorBreach: true,
};

async function getSettings(uid: string): Promise<PriceWarSettingsDoc> {
  try {
    const ref = doc(db, "users", uid, "priceWarSettings", "config");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as PriceWarSettingsDoc;
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    handleFirestoreError("getPriceWarSettings", error);
    return DEFAULT_SETTINGS;
  }
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const settings = await getSettings(uid);
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch settings", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const current = await getSettings(uid);
    const updated: PriceWarSettingsDoc = {
      ...current,
      ...body,
      updatedAt: serverTimestamp(),
    };

    const ref = doc(db, "users", uid, "priceWarSettings", "config");
    await setDoc(ref, updated);

    return NextResponse.json({ settings: updated, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update settings", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
