import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import {
  createAlert,
  getUserAlerts,
  deleteAlert,
  toggleAlert,
  type AlertStore,
  type SearchAlert,
} from "@/lib/search/alerts";

function getFirestoreAlertStore(): AlertStore {
  return {
    async create(data) {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const ref = db.collection("searchAlerts").doc();
      const alert: SearchAlert = {
        ...data,
        id: ref.id,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await ref.set(alert);
      return alert;
    },
    async getAll(userId) {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const snap = await db
        .collection("searchAlerts")
        .where("userId", "==", userId)
        .get();
      return snap.docs.map((d) => d.data() as SearchAlert);
    },
    async get(userId, alertId) {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const doc = await db.collection("searchAlerts").doc(alertId).get();
      const data = doc.data() as SearchAlert | undefined;
      if (data && data.userId === userId) return data;
      return null;
    },
    async delete(userId, alertId) {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const ref = db.collection("searchAlerts").doc(alertId);
      const doc = await ref.get();
      const data = doc.data() as SearchAlert | undefined;
      if (!data || data.userId !== userId) {
        throw new Error("Not found");
      }
      await ref.delete();
    },
    async update(userId, alertId, data) {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const ref = db.collection("searchAlerts").doc(alertId);
      const doc = await ref.get();
      const existing = doc.data() as SearchAlert | undefined;
      if (!existing || existing.userId !== userId) {
        throw new Error("Not found");
      }
      await ref.update(data);
    },
  };
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const store = getFirestoreAlertStore();
    const alerts = await getUserAlerts(store, uid);
    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { query, platforms, priceMin, priceMax, minRating, notifyOn, threshold } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const store = getFirestoreAlertStore();
    const alert = await createAlert(store, uid, {
      query: query.trim().slice(0, 200),
      platforms: Array.isArray(platforms) ? platforms.filter((p): p is string => typeof p === "string").slice(0, 20) : [],
      priceMin: typeof priceMin === "number" ? priceMin : undefined,
      priceMax: typeof priceMax === "number" ? priceMax : undefined,
      minRating: typeof minRating === "number" ? minRating : undefined,
      notifyOn: notifyOn === "new_product" || notifyOn === "price_drop" ? notifyOn : "any",
      threshold: typeof threshold === "number" ? threshold : undefined,
    });

    return NextResponse.json({ success: true, alert });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get("alertId");

    if (!alertId) {
      return NextResponse.json({ error: "alertId required" }, { status: 400 });
    }

    const store = getFirestoreAlertStore();
    try {
      await deleteAlert(store, uid, alertId);
    } catch {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { alertId, active } = body;

    if (!alertId || typeof active !== "boolean") {
      return NextResponse.json({ error: "alertId and active required" }, { status: 400 });
    }

    const store = getFirestoreAlertStore();
    try {
      await toggleAlert(store, uid, alertId, active);
    } catch {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, LIMITS.DEFAULT);
