import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";
import { withAuth } from "@/lib/auth";
import {
  ProductLifecycleSchema,
  UpdateLifecycleStageSchema,
  UpdateLifecycleProductSchema,
  DeleteLifecycleProductSchema,
  MarkAlertsReadSchema,
  validateBody,
} from "@/lib/validation";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const db = await getAdminDB();
    const userDoc = db.collection("users").doc(uid);

    if (type === "alerts") {
      const snap = await userDoc.collection("lifecycleAlerts").orderBy("createdAt", "desc").limit(50).get();
      const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ alerts });
    }

    if (type === "stages") {
      const snap = await userDoc.collection("productLifecycle").where("archived", "!=", true).get();
      const products = snap.docs.map((d) => d.data() as DocumentData);
      const stageList = ["discovery", "testing", "winning", "scaling", "saturation", "sunset"];
      const distribution = stageList.map((stage) => ({
        stage,
        count: products.filter((p) => p.currentStage === stage).length,
        products: products.filter((p) => p.currentStage === stage).map((p) => (p.productTitle as string) || "Unknown"),
      }));
      return NextResponse.json({ stages: distribution });
    }

    if (type === "snapshots") {
      const productId = searchParams.get("productId");
      if (!productId) {
        return NextResponse.json({ error: "productId required" }, { status: 400 });
      }
      const snap = await userDoc.collection("lifecycleSnapshots")
        .where("productId", "==", productId)
        .orderBy("date", "desc")
        .limit(90)
        .get();
      const snapshots = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ snapshots });
    }

    // Default: products with full data
    const snap = await userDoc.collection("productLifecycle").orderBy("createdAt", "desc").limit(100).get();
    const lifecycleProducts = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        productId: data.productId || d.id,
        productTitle: data.productTitle || "Unknown Product",
        productImage: data.productImage || "",
        category: data.category || "",
        currentStage: data.currentStage || "discovery",
        stageEnteredAt: data.stageEnteredAt || data.createdAt || new Date().toISOString(),
        daysInStage: data.daysInStage || 0,
        totalDaysTracked: data.totalDaysTracked || 0,
        supplierUrl: data.supplierUrl || "",
        storeUrl: data.storeUrl || "",
        notes: data.notes || "",
        archived: data.archived || false,
        snapshots: [],
        metrics: data.metrics || {
          totalOrders: 0,
          totalRevenue: 0,
          totalProfit: 0,
          avgProfitMargin: 0,
          competitionCount: null,
          searchVolume: null,
          trendDirection: null,
        },
        alerts: [],
        recommendations: data.recommendations || [],
        createdAt: data.createdAt,
      };
    });

    return NextResponse.json({ products: lifecycleProducts });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch lifecycle data", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(ProductLifecycleSchema, body);
    if (!validation.success) return validation.response;
    const entry = validation.data;

    const db = await getAdminDB();
    const ref = await db.collection("users").doc(uid).collection("productLifecycle").add({
      ...entry,
      archived: false,
      daysInStage: 0,
      metrics: {
        totalOrders: 0,
        totalRevenue: 0,
        totalProfit: 0,
        avgProfitMargin: 0,
        competitionCount: null,
        searchVolume: null,
        trendDirection: null,
      },
      recommendations: [],
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: ref.id });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save lifecycle data", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const PUT = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(UpdateLifecycleProductSchema, body);
    if (!validation.success) return validation.response;
    const { productId, ...updates } = validation.data;

    const db = await getAdminDB();
    const userDoc = db.collection("users").doc(uid);

    const snap = await userDoc.collection("productLifecycle").where("productId", "==", productId).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await snap.docs[0].ref.update(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update product", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "stage";

    const db = await getAdminDB();
    const userDoc = db.collection("users").doc(uid);

    if (action === "stage") {
      const stageValidation = validateBody(UpdateLifecycleStageSchema, body);
      if (!stageValidation.success) return stageValidation.response;
      const { productId, newStage } = stageValidation.data;

      const snap = await userDoc.collection("productLifecycle").where("productId", "==", productId).limit(1).get();
      if (snap.empty) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const docRef = snap.docs[0].ref;
      const data = snap.docs[0].data();
      const stageOrder = ["discovery", "testing", "winning", "scaling", "saturation", "sunset"];
      const currentIdx = stageOrder.indexOf(data.currentStage);
      const newIdx = stageOrder.indexOf(newStage);

      await docRef.update({
        currentStage: newStage,
        stageEnteredAt: new Date().toISOString(),
        daysInStage: 0,
        totalDaysTracked: (data.totalDaysTracked || 0) + (data.daysInStage || 0),
      });

      // Create a stage transition alert
      if (newIdx !== currentIdx) {
        await userDoc.collection("lifecycleAlerts").add({
          productId,
          productTitle: data.productTitle,
          type: "stage_transition",
          severity: newIdx > currentIdx ? "info" : "warning",
          title: newIdx > currentIdx ? `Advanced to ${newStage}` : `Moved back to ${newStage}`,
          description: `${data.productTitle} moved from ${data.currentStage} to ${newStage}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "alerts-read") {
      const alertValidation = validateBody(MarkAlertsReadSchema, body);
      if (!alertValidation.success) return alertValidation.response;
      const { alertIds } = alertValidation.data;

      const batch = db.batch();
      for (const alertId of alertIds) {
        const alertRef = userDoc.collection("lifecycleAlerts").doc(alertId);
        batch.update(alertRef, { read: true });
      }
      await batch.commit();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to perform action", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(DeleteLifecycleProductSchema, body);
    if (!validation.success) return validation.response;
    const { productId } = validation.data;

    const db = await getAdminDB();
    const userDoc = db.collection("users").doc(uid);

    const snap = await userDoc.collection("productLifecycle").where("productId", "==", productId).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await snap.docs[0].ref.delete();

    // Also delete related snapshots
    const snapshotsSnap = await userDoc.collection("lifecycleSnapshots").where("productId", "==", productId).get();
    const batch = db.batch();
    snapshotsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete product", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
