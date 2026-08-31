import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { safeNum, safeStr } from "@/lib/utils-helpers";

interface ScanResult {
  hasChanges: boolean;
  criticalCount: number;
  newOpportunities: string[];
  urgentActions: string[];
  scanTimestamp: string;
  summary: string;
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    // Fetch critical data in parallel
    const [
      alertsSnap,
      supplierAlertsSnap,
      lifecycleAlertsSnap,
      csConversationsSnap,
      revenueSnap,
      storeSnap,
      pushedProductsSnap,
    ] = await Promise.all([
      userRef.collection("alerts").where("read", "==", false).orderBy("createdAt", "desc").limit(20).get(),
      userRef.collection("supplierAlerts").where("read", "==", false).orderBy("createdAt", "desc").limit(10).get(),
      userRef.collection("lifecycleAlerts").where("read", "==", false).orderBy("createdAt", "desc").limit(10).get(),
      userRef.collection("csConversations").where("status", "==", "escalated").limit(10).get(),
      userRef.collection("revenue").orderBy("createdAt", "desc").limit(7).get(),
      userRef.collection("storeConnections").get(),
      userRef.collection("pushedProducts").where("status", "==", "error").limit(10).get(),
    ]);

    const alerts = alertsSnap.docs.map((d) => d.data() as DocumentData);
    const supplierAlerts = supplierAlertsSnap.docs.map((d) => d.data() as DocumentData);
    const lifecycleAlerts = lifecycleAlertsSnap.docs.map((d) => d.data() as DocumentData);
    const escalated = csConversationsSnap.docs.map((d) => d.data() as DocumentData);
    const revenue = revenueSnap.docs.map((d) => d.data() as DocumentData);
    const stores = storeSnap.docs.map((d) => d.data() as DocumentData);
    const erroredProducts = pushedProductsSnap.docs.map((d) => d.data() as DocumentData);

    // Detect critical issues
    const criticalCount =
      alerts.filter((a) => safeStr(a.type) === "warning" || safeStr(a.type) === "risk").length +
      supplierAlerts.filter((a) => safeStr(a.severity) === "high").length +
      escalated.length +
      erroredProducts.length;

    // Detect new opportunities
    const newOpportunities: string[] = [];
    const opportunityAlerts = alerts.filter((a) => safeStr(a.type) === "opportunity");
    opportunityAlerts.forEach((a) => {
      newOpportunities.push(safeStr(a.title));
    });

    // Detect urgent actions
    const urgentActions: string[] = [];

    if (escalated.length > 0) {
      urgentActions.push(`${escalated.length} customer conversation${escalated.length > 1 ? "s" : ""} need${escalated.length === 1 ? "s" : ""} immediate attention`);
    }

    const highSupplierAlerts = supplierAlerts.filter((a) => safeStr(a.severity) === "high");
    if (highSupplierAlerts.length > 0) {
      urgentActions.push(`${highSupplierAlerts.length} supplier alert${highSupplierAlerts.length > 1 ? "s" : ""} requiring action`);
    }

    if (erroredProducts.length > 0) {
      urgentActions.push(`${erroredProducts.length} product${erroredProducts.length > 1 ? "s" : ""} failed to push to store`);
    }

    // Revenue trend detection
    if (revenue.length >= 2) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const todayRev = revenue.filter((e) => safeStr(e.date) === today).reduce((s, e) => s + safeNum(e.amount), 0);
      const yesterdayRev = revenue.filter((e) => safeStr(e.date) === yesterday).reduce((s, e) => s + safeNum(e.amount), 0);
      if (yesterdayRev > 0 && todayRev < yesterdayRev * 0.5) {
        urgentActions.push(`Revenue dropped ${Math.round(((yesterdayRev - todayRev) / yesterdayRev) * 100)}% compared to yesterday`);
      }
    }

    // No store connected
    const connectedStores = stores.filter((s) => safeStr(s.status) === "connected");
    if (connectedStores.length === 0 && criticalCount === 0) {
      newOpportunities.push("Connect your first store to start selling");
    }

    // Build summary
    let summary = "";
    if (criticalCount === 0 && urgentActions.length === 0) {
      summary = "All clear! No critical issues detected. Your business is running smoothly.";
    } else {
      const parts: string[] = [];
      if (criticalCount > 0) parts.push(`${criticalCount} critical issue${criticalCount > 1 ? "s" : ""}`);
      if (urgentActions.length > 0) parts.push(`${urgentActions.length} urgent action${urgentActions.length > 1 ? "s" : ""}`);
      summary = `Scan detected: ${parts.join(", ")}. Review and take action.`;
    }

    const result: ScanResult = {
      hasChanges: criticalCount > 0 || urgentActions.length > 0 || newOpportunities.length > 0,
      criticalCount,
      newOpportunities,
      urgentActions,
      scanTimestamp: new Date().toISOString(),
      summary,
    };

    // Save last scan result
    await userRef.set({ lastScan: result }, { merge: true });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Scan failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);
