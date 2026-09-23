import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { RoutingDecisionSchema, SavePreferencesSchema, RouteOrderSchema, ReRouteSchema, validateBody } from "@/lib/validation";
import { safeErrorMessage } from "@/lib/api-errors";

/** Bounded Firestore scan window for in-memory search/filter. */
const SEARCH_WINDOW = 500;

function supplierDisplayName(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const name = (value as Record<string, unknown>).supplierName;
    if (typeof name === "string") return name;
  }
  return "";
}

function decisionMatches(d: Record<string, unknown>, q: string, supplier: string): boolean {
  if (supplier && supplierDisplayName(d.selectedSupplier) !== supplier) return false;
  if (!q) return true;
  const title = typeof d.productTitle === "string" ? d.productTitle.toLowerCase() : "";
  const orderId = typeof d.orderId === "string" ? d.orderId.toLowerCase() : "";
  const custLoc = typeof d.customerLocation === "string" ? d.customerLocation.toLowerCase() : "";
  const supName = supplierDisplayName(d.selectedSupplier).toLowerCase();
  return title.includes(q) || orderId.includes(q) || custLoc.includes(q) || supName.includes(q);
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const supplier = searchParams.get("supplier") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limitParam = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));
    const offset = (page - 1) * limitParam;

    const db = await getAdminDB();

    if (type === "decisions") {
      let queryRef: FirebaseFirestore.Query = db.collection("users").doc(uid).collection("routingDecisions");

      if (status) {
        queryRef = queryRef.where("status", "==", status);
      }

      const sortField = sortBy === "totalCost" ? "totalCost" : sortBy === "shippingDays" ? "shippingDays" : "createdAt";
      queryRef = queryRef.orderBy(sortField, sortOrder === "asc" ? "asc" : "desc");

      const q = search.trim().toLowerCase();

      if (q || supplier) {
        // contains() and object-field equality aren't expressible in Firestore —
        // scan a bounded window, filter in memory, then paginate.
        const windowSnap = await queryRef.limit(SEARCH_WINDOW).get();
        const matched = windowSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>)
          .filter((d) => decisionMatches(d, q, supplier));
        const totalCount = matched.length;
        const decisions = matched.slice(offset, offset + limitParam);
        return NextResponse.json({ decisions, totalCount, page, limit: limitParam, totalPages: Math.ceil(totalCount / limitParam) });
      }

      const countSnap = await queryRef.count().get();
      const totalCount = countSnap.data().count;

      const snap = await queryRef.offset(offset).limit(limitParam).get();
      const decisions = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>);

      return NextResponse.json({ decisions, totalCount, page, limit: limitParam, totalPages: Math.ceil(totalCount / limitParam) });
    }

    if (type === "preferences") {
      const snap = await db.collection("users").doc(uid).collection("routingPreferences").doc("default").get();
      const preferences = snap.exists ? { id: snap.id, ...snap.data() } : null;
      return NextResponse.json({ preferences });
    }

    if (type === "analytics") {
      const daysParam = parseInt(searchParams.get("days") || "30", 10);
      const daysLimit = Math.min(365, Math.max(1, daysParam));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysLimit);
      const cutoffISO = cutoff.toISOString();

      const snap = await db.collection("users").doc(uid).collection("routingDecisions")
        .where("createdAt", ">=", cutoffISO)
        .orderBy("createdAt", "desc").get();
      const decisions = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>;

      if (decisions.length === 0) {
        return NextResponse.json({
          analytics: {
            totalRouted: 0,
            avgShippingDays: 0,
            avgCost: 0,
            supplierDistribution: [],
            optimizationBreakdown: [],
            costSavings: 0,
            timeSavings: 0,
            dailyCounts: [],
            monthlyTrend: [],
          },
        });
      }

      let totalShippingDays = 0, totalCost = 0, totalSavings = 0, totalTimeSavings = 0;
      const supplierCounts: Record<string, number> = {};
      const optCounts: Record<string, number> = { Speed: 0, Cost: 0, Balanced: 0 };
      const dailyCounts: Record<string, number> = {};

      for (const d of decisions) {
        const supplier = typeof d.selectedSupplier === "object" && d.selectedSupplier !== null ? d.selectedSupplier as Record<string, unknown> : null;
        const days = typeof d.shippingDays === "number" ? d.shippingDays : (supplier && typeof supplier.shippingDays === "number" ? supplier.shippingDays : 0);
        const cost = typeof d.totalCost === "number" ? d.totalCost : 0;
        const name = typeof d.selectedSupplier === "string" ? d.selectedSupplier : (supplier && typeof supplier.supplierName === "string" ? supplier.supplierName : "Unknown");

        totalShippingDays += days;
        totalCost += cost;
        supplierCounts[name] = (supplierCounts[name] || 0) + 1;

        totalSavings += cost > 0 ? cost * 0.3 : 0;
        totalTimeSavings += days > 0 ? Math.round(days * 0.25) : 0;

        const reasoning = (typeof d.reasoning === "string" ? d.reasoning : "").toLowerCase();
        if (reasoning.includes("speed") || reasoning.includes("fast")) optCounts.Speed++;
        else if (reasoning.includes("cost") || reasoning.includes("cheap")) optCounts.Cost++;
        else optCounts.Balanced++;

        const createdAt = typeof d.createdAt === "string" ? d.createdAt : "";
        if (createdAt) {
          const day = createdAt.slice(0, 10);
          dailyCounts[day] = (dailyCounts[day] || 0) + 1;
        }
      }

      const count = decisions.length;
      const supplierDistribution = Object.entries(supplierCounts).map(([name, cnt]) => ({
        name,
        count: cnt,
        color: cnt / count > 0.5 ? "#22c55e" : cnt / count > 0.3 ? "#3b82f6" : cnt / count > 0.15 ? "#a855f7" : "#f59e0b",
      }));

      const dailyCountsArray = Object.entries(dailyCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      return NextResponse.json({
        analytics: {
          totalRouted: count,
          avgShippingDays: +(totalShippingDays / count).toFixed(1),
          avgCost: +(totalCost / count).toFixed(2),
          supplierDistribution,
          optimizationBreakdown: Object.entries(optCounts)
            .map(([type, c]) => ({ type, count: c }))
            .filter((o) => o.count > 0),
          costSavings: +totalSavings.toFixed(2),
          timeSavings: count > 0 ? +(totalTimeSavings / count).toFixed(1) : 0,
          dailyCounts: dailyCountsArray,
        },
      });
    }

    if (type === "history") {
      let queryRef: FirebaseFirestore.Query = db.collection("users").doc(uid).collection("routingDecisions").orderBy("createdAt", "desc");

      if (status) queryRef = queryRef.where("status", "==", status);

      const mapHistory = (d: { id: string; data: () => FirebaseFirestore.DocumentData }) => {
        const data = d.data();
        const supplierObj = typeof data.selectedSupplier === "object" && data.selectedSupplier !== null ? data.selectedSupplier as Record<string, unknown> : null;
        return {
          id: d.id,
          orderId: data.orderId || "",
          productTitle: data.productTitle || "",
          customerLocation: data.customerLocation || "",
          customerName: data.customerName || "",
          selectedSupplier: typeof data.selectedSupplier === "string" ? data.selectedSupplier : (supplierObj?.supplierName as string || "Unknown"),
          shippingDays: typeof data.shippingDays === "number" ? data.shippingDays : (supplierObj?.shippingDays as number || 0),
          shippingCost: typeof data.shippingCost === "number" ? data.shippingCost : (supplierObj?.shippingCost as number || 0),
          totalCost: typeof data.totalCost === "number" ? data.totalCost : 0,
          reason: data.reasoning || "",
          status: data.status || "routed",
          routedAt: data.routedAt || data.createdAt || "",
        };
      };

      const q = search.trim().toLowerCase();
      const matchesHistory = (h: { orderId: string; productTitle: string; customerLocation: string; selectedSupplier: string }) => {
        if (supplier && h.selectedSupplier !== supplier) return false;
        if (!q) return true;
        return h.orderId.toLowerCase().includes(q) || h.productTitle.toLowerCase().includes(q) ||
          h.customerLocation.toLowerCase().includes(q) || h.selectedSupplier.toLowerCase().includes(q);
      };

      if (q || supplier) {
        // contains() and object-field equality aren't expressible in Firestore —
        // scan a bounded window, filter in memory, then paginate.
        const windowSnap = await queryRef.limit(SEARCH_WINDOW).get();
        const history = windowSnap.docs.map(mapHistory).filter(matchesHistory).slice(offset, offset + limitParam);
        return NextResponse.json({ history });
      }

      const snap = await queryRef.offset(offset).limit(limitParam).get();
      return NextResponse.json({ history: snap.docs.map(mapHistory) });
    }

    if (type === "suppliers") {
      const snap = await db.collection("users").doc(uid).collection("routingDecisions").orderBy("createdAt", "desc").limit(200).get();
      const supplierSet = new Set<string>();
      for (const d of snap.docs) {
        const data = d.data();
        if (typeof data.selectedSupplier === "string") supplierSet.add(data.selectedSupplier);
        else if (typeof data.selectedSupplier === "object" && data.selectedSupplier !== null) {
          const name = (data.selectedSupplier as Record<string, unknown>).supplierName;
          if (typeof name === "string") supplierSet.add(name);
        }
      }
      return NextResponse.json({ suppliers: Array.from(supplierSet).sort() });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch routing data", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const action = body.action as string | undefined;

    if (action === "route") {
      const validation = validateBody(RouteOrderSchema, body);
      if (!validation.success) return validation.response;
      const data = validation.data;

      const db = await getAdminDB();
      const ref = await db.collection("users").doc(uid).collection("routingDecisions").add({
        orderId: data.orderId,
        customerLocation: data.customerLocation,
        productTitle: data.productTitle,
        customerName: data.customerName,
        quantity: data.quantity,
        totalPrice: data.totalPrice,
        selectedSupplier: "AI Selected",
        shippingDays: 0,
        shippingCost: 0,
        totalCost: 0,
        reasoning: "Order queued for AI routing. Supplier will be selected based on current preferences.",
        status: "pending",
        routedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Order queued for routing",
        id: ref.id,
      });
    }

    const validation = validateBody(RoutingDecisionSchema, body);
    if (!validation.success) return validation.response;
    const decision = validation.data;

    const db = await getAdminDB();
    const ref = await db.collection("users").doc(uid).collection("routingDecisions").add({
      ...decision,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Order routed successfully",
      id: ref.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to route order", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(SavePreferencesSchema, body);
    if (!validation.success) return validation.response;
    const prefs = validation.data;

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("routingPreferences").doc("default").set({
      ...prefs,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Routing preferences saved",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save preferences", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(ReRouteSchema, body);
    if (!validation.success) return validation.response;
    const { decisionId, reason } = validation.data;

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("routingDecisions").doc(decisionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    }

    await docRef.update({
      status: "pending",
      reasoning: reason || "Re-routed by user. Pending AI supplier selection.",
      reRoutedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Order queued for re-routing",
      id: decisionId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to re-route order", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const decisionId = searchParams.get("id");
    if (!decisionId) {
      return NextResponse.json({ error: "Missing decision id" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("routingDecisions").doc(decisionId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    }

    await docRef.delete();

    return NextResponse.json({
      success: true,
      message: "Routing decision deleted",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete decision", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});
