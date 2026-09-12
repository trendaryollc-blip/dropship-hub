import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const COLLECTION = "system";
const DOC_ID = "supplierProviderKeys";

export interface AdminSupplierKeyEntry {
  id: string;
  key: string;
  label: string;
  priority: number;
  requestsUsed: number;
  requestsLimit: number;
  resetDate: string;
  lastError: string | null;
  lastStatus: "healthy" | "error" | "untested";
}

const PROVIDERS = [
  "rainforest", "serpapi", "scraperapi", "serper", "rapidapi",
  "trendsi", "veridion", "supplierio", "salehoo", "spocket",
  "dataforseo", "ecomsource",
];

function generateKeyId(): string {
  return `skey_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function maskKey(key: string): string {
  if (!key || key.length <= 8) return "••••••••";
  return "••••" + key.slice(-4);
}

export const GET = requireOwner(async () => {
  try {
    const db = await getAdminDB();
    const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
    const data = doc.exists ? doc.data() : {};

    const result: Record<string, { keys: Array<AdminSupplierKeyEntry & { masked: string }>; configured: boolean }> = {};
    for (const p of PROVIDERS) {
      const keys = ((data as Record<string, unknown>)[p] as AdminSupplierKeyEntry[]) || [];
      result[p] = {
        keys: keys.map((k) => ({ ...k, masked: maskKey(k.key) })),
        configured: keys.length > 0,
      };
    }

    return NextResponse.json({ providers: result });
  } catch (error) {
    console.error("[AdminSupplierKeys] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch supplier keys" },
      { status: 500 }
    );
  }
});

export const POST = requireOwner(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, provider, keyId, key, label, requestsLimit, resetDate, updates } = body;

    if (!provider || !PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "valid provider string required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection(COLLECTION).doc(DOC_ID);

    if (action === "add_key") {
      if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

      const newEntry: AdminSupplierKeyEntry = {
        id: generateKeyId(),
        key: key.trim(),
        label: label || "Primary",
        priority: 0,
        requestsUsed: 0,
        requestsLimit: requestsLimit || 1000,
        resetDate: resetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        lastError: null,
        lastStatus: "untested",
      };

      await docRef.set({}, { merge: true });

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const data = snap.data() || {};
        const existingKeys = (data[provider] as AdminSupplierKeyEntry[]) || [];
        newEntry.priority = existingKeys.length + 1;
        tx.update(docRef, { [provider]: [...existingKeys, newEntry], updatedAt: FieldValue.serverTimestamp() });
      });

      return NextResponse.json({ success: true });
    }

    if (action === "update_key") {
      if (!keyId || !updates) return NextResponse.json({ error: "keyId and updates required" }, { status: 400 });

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const data = snap.data() || {};
        const existingKeys = (data[provider] as AdminSupplierKeyEntry[]) || [];
        const updatedKeys = existingKeys.map((k) =>
          k.id === keyId ? { ...k, ...updates } : k
        );
        tx.update(docRef, { [provider]: updatedKeys, updatedAt: FieldValue.serverTimestamp() });
      });

      return NextResponse.json({ success: true });
    }

    if (action === "remove_key") {
      if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 });

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const data = snap.data() || {};
        const existingKeys = (data[provider] as AdminSupplierKeyEntry[]) || [];
        const filtered = existingKeys.filter((k) => k.id !== keyId);
        const reordered = filtered.map((k, i) => ({ ...k, priority: i + 1 }));
        tx.update(docRef, { [provider]: reordered, updatedAt: FieldValue.serverTimestamp() });
      });

      return NextResponse.json({ success: true });
    }

    if (action === "reset_usage") {
      if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 });

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const data = snap.data() || {};
        const existingKeys = (data[provider] as AdminSupplierKeyEntry[]) || [];
        const updatedKeys = existingKeys.map((k) =>
          k.id === keyId ? { ...k, requestsUsed: 0, lastError: null, lastStatus: "untested" as const } : k
        );
        tx.update(docRef, { [provider]: updatedKeys, updatedAt: FieldValue.serverTimestamp() });
      });

      return NextResponse.json({ success: true });
    }

    if (action === "reorder_keys") {
      const { keyIds } = body;
      if (!Array.isArray(keyIds)) return NextResponse.json({ error: "keyIds array required" }, { status: 400 });

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const data = snap.data() || {};
        const existingKeys = (data[provider] as AdminSupplierKeyEntry[]) || [];
        const reordered = keyIds.map((id: string, i: number) => {
          const key = existingKeys.find((k) => k.id === id);
          return key ? { ...key, priority: i + 1 } : null;
        }).filter(Boolean);
        tx.update(docRef, { [provider]: reordered, updatedAt: FieldValue.serverTimestamp() });
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[AdminSupplierKeys] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});
