import { NextRequest, NextResponse } from "next/server";
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
    async delete(_userId, alertId) {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      await db.collection("searchAlerts").doc(alertId).delete();
    },
    async update(_userId, alertId, data) {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      await db.collection("searchAlerts").doc(alertId).update(data);
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 401 });
    }
    const store = getFirestoreAlertStore();
    const alerts = await getUserAlerts(store, userId);
    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, query, platforms, priceMin, priceMax, minRating, notifyOn, threshold } = body;

    if (!userId || !query) {
      return NextResponse.json({ error: "userId and query required" }, { status: 400 });
    }

    const store = getFirestoreAlertStore();
    const alert = await createAlert(store, userId, {
      query,
      platforms: platforms || [],
      priceMin,
      priceMax,
      minRating,
      notifyOn: notifyOn || "any",
      threshold,
    });

    return NextResponse.json({ alert });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const alertId = searchParams.get("alertId");

    if (!userId || !alertId) {
      return NextResponse.json({ error: "userId and alertId required" }, { status: 400 });
    }

    const store = getFirestoreAlertStore();
    await deleteAlert(store, userId, alertId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, alertId, active } = body;

    if (!userId || !alertId || typeof active !== "boolean") {
      return NextResponse.json({ error: "userId, alertId, and active required" }, { status: 400 });
    }

    const store = getFirestoreAlertStore();
    await toggleAlert(store, userId, alertId, active);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
