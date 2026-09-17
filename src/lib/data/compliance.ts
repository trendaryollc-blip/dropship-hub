import { getAdminDB } from "@/lib/firebase-admin";
import { handleFirestoreError } from "./utils";
import type { ComplianceDoc, ComplianceRiskLevel } from "@/types/compliance";

const COLLECTION = "complianceChecks";

export async function addComplianceCheck(
  uid: string,
  entry: Omit<ComplianceDoc, "id" | "createdAt">
): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection(COLLECTION).doc();
    const doc: Record<string, unknown> = { ...entry, createdAt: new Date().toISOString() };
    if (entry.report) {
      doc.report = entry.report;
    }
    await ref.set(doc);
    return ref.id;
  } catch (error) {
    handleFirestoreError("addComplianceCheck", error);
    return undefined;
  }
}

export async function getComplianceChecks(
  uid: string,
  maxResults = 50
): Promise<ComplianceDoc[]> {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users").doc(uid).collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(maxResults)
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        report: data.report ?? undefined,
      } as ComplianceDoc;
    });
  } catch (error) {
    handleFirestoreError("getComplianceChecks", error);
    return [];
  }
}

export async function getComplianceCheckById(
  uid: string,
  checkId: string
): Promise<ComplianceDoc | null> {
  try {
    const db = await getAdminDB();
    const doc = await db
      .collection("users").doc(uid).collection(COLLECTION).doc(checkId)
      .get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      report: data.report ?? undefined,
    } as ComplianceDoc;
  } catch (error) {
    handleFirestoreError("getComplianceCheckById", error);
    return null;
  }
}

export async function deleteComplianceCheck(
  uid: string,
  checkId: string
): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db
      .collection("users").doc(uid).collection(COLLECTION).doc(checkId)
      .delete();
    return true;
  } catch (error) {
    handleFirestoreError("deleteComplianceCheck", error);
    return false;
  }
}

export async function getComplianceStats(uid: string): Promise<{
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  violationChecks: number;
  blockedProducts: number;
  avgScore: number;
  riskBreakdown: Record<ComplianceRiskLevel, number>;
  marketBreakdown: Record<string, { total: number; passed: number; blocked: number }>;
}> {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users").doc(uid).collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const docs = snap.docs.map((d) => d.data()) as ComplianceDoc[];
    const total = docs.length;

    const defaultRisk: Record<ComplianceRiskLevel, number> = { safe: 0, low: 0, medium: 0, high: 0, blocked: 0 };

    if (total === 0) {
      return {
        totalChecks: 0,
        passedChecks: 0,
        warningChecks: 0,
        violationChecks: 0,
        blockedProducts: 0,
        avgScore: 0,
        riskBreakdown: defaultRisk,
        marketBreakdown: {},
      };
    }

    const passedChecks = docs.filter((d) => d.riskLevel === "safe" || d.riskLevel === "low").length;
    const warningChecks = docs.filter((d) => d.riskLevel === "medium").length;
    const violationChecks = docs.filter((d) => d.riskLevel === "high").length;
    const blockedProducts = docs.filter((d) => d.riskLevel === "blocked").length;
    const avgScore = docs.reduce((sum, d) => sum + d.overallScore, 0) / total;

    const riskBreakdown: Record<ComplianceRiskLevel, number> = { safe: 0, low: 0, medium: 0, high: 0, blocked: 0 };
    docs.forEach((d) => { riskBreakdown[d.riskLevel]++; });

    const marketBreakdown: Record<string, { total: number; passed: number; blocked: number }> = {};
    docs.forEach((d) => {
      const markets = Array.isArray((d.inputs as Record<string, unknown>)?.targetMarkets)
        ? ((d.inputs as Record<string, unknown>).targetMarkets as string[])
        : typeof (d.inputs as Record<string, unknown>)?.targetMarkets === "string"
          ? [((d.inputs as Record<string, unknown>).targetMarkets as string)]
          : [];
      markets.forEach((market) => {
        if (!marketBreakdown[market]) {
          marketBreakdown[market] = { total: 0, passed: 0, blocked: 0 };
        }
        marketBreakdown[market].total++;
        if (d.riskLevel === "safe" || d.riskLevel === "low" || d.riskLevel === "medium") {
          marketBreakdown[market].passed++;
        }
        if (d.riskLevel === "blocked") {
          marketBreakdown[market].blocked++;
        }
      });
    });

    return {
      totalChecks: total,
      passedChecks,
      warningChecks,
      violationChecks,
      blockedProducts,
      avgScore: Math.round(avgScore),
      riskBreakdown,
      marketBreakdown,
    };
  } catch (error) {
    handleFirestoreError("getComplianceStats", error);
    return {
      totalChecks: 0,
      passedChecks: 0,
      warningChecks: 0,
      violationChecks: 0,
      blockedProducts: 0,
      avgScore: 0,
      riskBreakdown: { safe: 0, low: 0, medium: 0, high: 0, blocked: 0 },
      marketBreakdown: {},
    };
  }
}
