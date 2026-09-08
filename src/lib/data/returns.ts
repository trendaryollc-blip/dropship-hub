import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import {
  ReturnRequestDocSchema,
  RefundCalculationDocSchema,
  DefectReportDocSchema,
  ReturnSettingsDocSchema,
  AddReturnRequestInputSchema,
  AddRefundCalculationInputSchema,
  AddDefectReportInputSchema,
  AddReturnSettingsInputSchema,
} from "./schemas";
import type {
  ReturnRequest,
  RefundCalculation,
  DefectReport,
  ReturnSettings,
  ReturnStatus,
  DefectAnalytics,
  SupplierDefectSummary,
  DefectSeverity,
  TrendDirection,
} from "@/types/returns";

// ── Return Requests ─────────────────────────────────────────────────────────

export interface ReturnRequestDoc {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: { productId: string; productName: string; quantity: number; unitPrice: number; imageUrl: string }[];
  reason: string;
  reasonDetails: string;
  status: ReturnStatus;
  returnLabel: { trackingNumber: string; carrier: string; returnAddress: string; instructions: string; labelUrl: string | null; generatedAt: string } | null;
  refundAmount: number;
  supplierId: string;
  supplierName: string;
  platform: string;
  storePlatform: string;
  createdAt: Timestamp;
}

export async function addReturnRequest(
  uid: string,
  data: Omit<ReturnRequest, "id" | "createdAt" | "updatedAt" | "status" | "returnLabel" | "refundAmount">
): Promise<string> {
  try {
    const input = AddReturnRequestInputSchema.parse(data);
    const ref = doc(collection(db, "users", uid, "returnRequests"));
    await setDoc(ref, {
      ...input,
      status: "pending",
      returnLabel: null,
      refundAmount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addReturnRequest", error);
  }
}

export async function getReturnRequests(
  uid: string,
  status?: ReturnStatus,
  limitCount = 50
): Promise<ReturnRequest[]> {
  try {
    let q: ReturnType<typeof query>;
    if (status) {
      q = query(
        collection(db, "users", uid, "returnRequests"),
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, "users", uid, "returnRequests"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...ReturnRequestDocSchema.parse(d.data()),
    })) as ReturnRequest[];
  } catch (error) {
    handleFirestoreError("getReturnRequests", error);
  }
}

export async function getReturnRequestById(
  uid: string,
  returnId: string
): Promise<ReturnRequest | null> {
  try {
    const snap = await getDocs(
      query(
        collection(db, "users", uid, "returnRequests"),
        where("__name__", "==", returnId),
        limit(1)
      )
    );
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...ReturnRequestDocSchema.parse(docSnap.data()) } as ReturnRequest;
  } catch (error) {
    handleFirestoreError("getReturnRequestById", error);
  }
}

export async function updateReturnRequest(
  uid: string,
  returnId: string,
  updates: Partial<Pick<ReturnRequest, "status" | "returnLabel" | "refundAmount">>
): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "returnRequests", returnId);
    await setDoc(ref, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError("updateReturnRequest", error);
  }
}

export async function deleteReturnRequest(uid: string, returnId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", uid, "returnRequests", returnId));
  } catch (error) {
    handleFirestoreError("deleteReturnRequest", error);
  }
}

// ── Refund Calculations ─────────────────────────────────────────────────────

export interface RefundCalculationDoc {
  id: string;
  returnRequestId: string;
  orderId: string;
  subtotal: number;
  shippingCost: number;
  platformFees: number;
  supplierRefundAmount: number;
  totalRefund: number;
  refundMethod: string;
  supplierPolicy: {
    type: string;
    restockingFeePercent: number;
    refundWindowDays: number;
    returnShippingPaidBy: string;
  };
  processed: boolean;
  processedAt: string | null;
  createdAt: Timestamp;
}

export async function addRefundCalculation(
  uid: string,
  data: Omit<RefundCalculation, "id" | "createdAt" | "processed" | "processedAt">
): Promise<string> {
  try {
    const input = AddRefundCalculationInputSchema.parse(data);
    const ref = doc(collection(db, "users", uid, "refundCalculations"));
    await setDoc(ref, {
      ...input,
      processed: false,
      processedAt: null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addRefundCalculation", error);
  }
}

export async function getRefundCalculations(
  uid: string,
  returnRequestId?: string,
  limitCount = 50
): Promise<RefundCalculation[]> {
  try {
    let q: ReturnType<typeof query>;
    if (returnRequestId) {
      q = query(
        collection(db, "users", uid, "refundCalculations"),
        where("returnRequestId", "==", returnRequestId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, "users", uid, "refundCalculations"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...RefundCalculationDocSchema.parse(d.data()),
    })) as RefundCalculation[];
  } catch (error) {
    handleFirestoreError("getRefundCalculations", error);
  }
}

export async function updateRefundCalculation(
  uid: string,
  refundId: string,
  updates: Partial<Pick<RefundCalculation, "processed" | "processedAt">>
): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "refundCalculations", refundId);
    await setDoc(ref, updates, { merge: true });
  } catch (error) {
    handleFirestoreError("updateRefundCalculation", error);
  }
}

// ── Defect Reports ──────────────────────────────────────────────────────────

export interface DefectReportDoc {
  id: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  orderId: string;
  defectType: string;
  description: string;
  severity: string;
  reportedBy: string;
  resolution: string;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: Timestamp;
}

export async function addDefectReport(
  uid: string,
  data: Omit<DefectReport, "id" | "createdAt" | "resolution" | "resolved" | "resolvedAt">
): Promise<string> {
  try {
    const input = AddDefectReportInputSchema.parse(data);
    const ref = doc(collection(db, "users", uid, "defectReports"));
    await setDoc(ref, {
      ...input,
      resolution: "pending",
      resolved: false,
      resolvedAt: null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addDefectReport", error);
  }
}

export async function getDefectReports(
  uid: string,
  supplierId?: string,
  limitCount = 100
): Promise<DefectReport[]> {
  try {
    let q: ReturnType<typeof query>;
    if (supplierId) {
      q = query(
        collection(db, "users", uid, "defectReports"),
        where("supplierId", "==", supplierId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, "users", uid, "defectReports"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...DefectReportDocSchema.parse(d.data()),
    })) as DefectReport[];
  } catch (error) {
    handleFirestoreError("getDefectReports", error);
  }
}

export async function updateDefectReport(
  uid: string,
  defectId: string,
  updates: Partial<Pick<DefectReport, "resolution" | "resolved" | "resolvedAt">>
): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "defectReports", defectId);
    await setDoc(ref, updates, { merge: true });
  } catch (error) {
    handleFirestoreError("updateDefectReport", error);
  }
}

// ── Defect Analytics ────────────────────────────────────────────────────────

export async function getDefectAnalytics(uid: string): Promise<DefectAnalytics> {
  try {
    const reports = await getDefectReports(uid);
    const supplierMap = new Map<string, DefectReport[]>();
    const productMap = new Map<string, { productName: string; defectCount: number; supplierName: string }>();
    const severityCounts: Record<DefectSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const report of reports) {
      const existing = supplierMap.get(report.supplierId) || [];
      existing.push(report);
      supplierMap.set(report.supplierId, existing);

      const productKey = `${report.productId}`;
      const existingProduct = productMap.get(productKey);
      if (existingProduct) {
        existingProduct.defectCount++;
      } else {
        productMap.set(productKey, {
          productName: report.productName,
          defectCount: 1,
          supplierName: report.supplierName,
        });
      }

      severityCounts[report.severity as DefectSeverity]++;
    }

    const suppliers: SupplierDefectSummary[] = [];
    for (const [supplierId, supplierReports] of supplierMap) {
      const firstReport = supplierReports[0];
      const defectTypeCounts = new Map<string, number>();
      const supplierProducts = new Map<string, { productName: string; defectCount: number }>();

      for (const r of supplierReports) {
        defectTypeCounts.set(r.defectType, (defectTypeCounts.get(r.defectType) || 0) + 1);
        const existing = supplierProducts.get(r.productId);
        if (existing) {
          existing.defectCount++;
        } else {
          supplierProducts.set(r.productId, { productName: r.productName, defectCount: 1 });
        }
      }

      const topDefectTypes = [...defectTypeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type: type as DefectReport["defectType"], count }));

      const products = [...supplierProducts.entries()]
        .sort((a, b) => b[1].defectCount - a[1].defectCount)
        .slice(0, 10)
        .map(([productId, data]) => ({ productId, ...data }));

      const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
      const worstSeverity = supplierReports.reduce(
        (worst, r) => (severityOrder[r.severity] > severityOrder[worst] ? r.severity : worst),
        "low" as string
      ) as DefectSeverity;

      const resolvedReports = supplierReports.filter((r) => r.resolved && r.resolvedAt);
      let avgResolutionDays = 0;
      if (resolvedReports.length > 0) {
        const totalDays = resolvedReports.reduce((sum, r) => {
          const created = new Date(r.createdAt as unknown as string).getTime();
          const resolved = new Date(r.resolvedAt!).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60 * 24);
        }, 0);
        avgResolutionDays = totalDays / resolvedReports.length;
      }

      suppliers.push({
        supplierId,
        supplierName: firstReport.supplierName,
        totalDefects: supplierReports.length,
        defectRate: reports.length > 0 ? supplierReports.length / reports.length : 0,
        avgResolutionDays,
        topDefectTypes,
        severity: worstSeverity,
        products,
        trend: "stable" as TrendDirection,
        period: "all",
      });
    }

    suppliers.sort((a, b) => b.totalDefects - a.totalDefects);

    const topDefectProducts = [...productMap.entries()]
      .sort((a, b) => b[1].defectCount - a[1].defectCount)
      .slice(0, 10)
      .map(([productId, data]) => ({ productId, ...data }));

    return {
      suppliers,
      totalDefects: reports.length,
      overallDefectRate: reports.length,
      topDefectProducts,
      severityBreakdown: severityCounts,
      period: "all",
    };
  } catch (error) {
    handleFirestoreError("getDefectAnalytics", error);
  }
}

// ── Return Settings ─────────────────────────────────────────────────────────

export interface ReturnSettingsDoc {
  id: string;
  autoDetectReturns: boolean;
  detectIntervalMinutes: number;
  autoGenerateLabels: boolean;
  defaultRefundMethod: string;
  notifyCustomer: boolean;
  restockingFeePercent: number;
  returnWindowDays: number;
}

export async function saveReturnSettings(
  uid: string,
  settings: Omit<ReturnSettings, "id">
): Promise<void> {
  try {
    const input = AddReturnSettingsInputSchema.parse(settings);
    const ref = doc(db, "users", uid, "returnSettings", "default");
    await setDoc(ref, input);
  } catch (error) {
    handleFirestoreError("saveReturnSettings", error);
  }
}

export async function getReturnSettings(uid: string): Promise<ReturnSettings | null> {
  try {
    const snap = await getDocs(
      query(collection(db, "users", uid, "returnSettings"), limit(1))
    );
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...ReturnSettingsDocSchema.parse(docSnap.data()) } as ReturnSettings;
  } catch (error) {
    handleFirestoreError("getReturnSettings", error);
  }
}

// ── Return Label Generation ─────────────────────────────────────────────────

export function generateReturnLabel(
  orderId: string,
  returnId: string,
  supplierName: string
): ReturnRequest["returnLabel"] {
  const trackingNumber = `RT${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const carriers = ["USPS", "UPS", "FedEx", "DHL"];
  const carrier = carriers[Math.floor(Math.random() * carriers.length)];

  return {
    trackingNumber,
    carrier,
    returnAddress: `Returns Center\n${supplierName}\n123 Return Lane\nLos Angeles, CA 90001`,
    instructions: `1. Print this return label and attach it to the package.\n2. Pack the item(s) securely in original packaging if possible.\n3. Drop off at any ${carrier} location.\n4. Keep your tracking number: ${trackingNumber}\n5. Refund will be processed within 3-5 business days of receipt.`,
    labelUrl: null,
    generatedAt: new Date().toISOString(),
  };
}

// ── Refund Calculation Engine ───────────────────────────────────────────────

export function calculateRefund(
  subtotal: number,
  shippingCost: number,
  platformFees: number,
  policy: {
    type: string;
    restockingFeePercent: number;
    refundWindowDays?: number;
    returnShippingPaidBy: string;
  }
): { supplierRefundAmount: number; totalRefund: number } {
  let supplierRefundAmount = 0;

  switch (policy.type) {
    case "full_refund":
      supplierRefundAmount = subtotal;
      break;
    case "partial_refund":
      supplierRefundAmount = subtotal * (1 - policy.restockingFeePercent / 100);
      break;
    case "store_credit_only":
      supplierRefundAmount = subtotal;
      break;
    case "no_refund":
      supplierRefundAmount = 0;
      break;
    default:
      supplierRefundAmount = subtotal;
  }

  const shippingRefund = policy.returnShippingPaidBy === "seller" ? shippingCost : 0;
  const totalRefund = Math.max(0, supplierRefundAmount + shippingRefund - platformFees);

  return {
    supplierRefundAmount: Math.round(supplierRefundAmount * 100) / 100,
    totalRefund: Math.round(totalRefund * 100) / 100,
  };
}

// ── Auto-Detect Returns ─────────────────────────────────────────────────────

export async function detectReturnsFromOrders(uid: string): Promise<
  { orderId: string; orderNumber: string; customerName: string; customerEmail: string; items: ReturnRequest["items"]; supplierId: string; supplierName: string; platform: string; storePlatform: string }[]
> {
  try {
    const db2 = await import("firebase/firestore").then((m) => m);
    const q = query(
      collection(db, "users", uid, "fulfillmentOrders"),
      where("status", "in", ["cancelled", "refunded"]),
      limit(50)
    );
    const snap = await getDocs(q);

    const existingReturns = await getReturnRequests(uid);
    const existingOrderIds = new Set(existingReturns.map((r) => r.orderId));

    const returnCandidates: {
      orderId: string;
      orderNumber: string;
      customerName: string;
      customerEmail: string;
      items: ReturnRequest["items"];
      supplierId: string;
      supplierName: string;
      platform: string;
      storePlatform: string;
    }[] = [];

    for (const orderDoc of snap.docs) {
      const order = orderDoc.data();
      if (existingOrderIds.has(orderDoc.id)) continue;

      const items = (order.items || []).map((item: Record<string, unknown>) => ({
        productId: (item.productId as string) || "",
        productName: (item.name as string) || (item.productName as string) || "Unknown Product",
        quantity: (item.quantity as number) || 1,
        unitPrice: (item.unitPrice as number) || (item.price as number) || 0,
        imageUrl: (item.imageUrl as string) || "",
      }));

      returnCandidates.push({
        orderId: orderDoc.id,
        orderNumber: order.orderNumber || orderDoc.id,
        customerName: order.customerName || "Unknown",
        customerEmail: order.customerEmail || "",
        items,
        supplierId: order.assignedSupplier || "unknown",
        supplierName: order.supplierName || "Unknown Supplier",
        platform: order.platformOrders?.[0]?.platform || "unknown",
        storePlatform: order.storePlatform || "custom",
      });
    }

    return returnCandidates;
  } catch (error) {
    handleFirestoreError("detectReturnsFromOrders", error);
  }
}
