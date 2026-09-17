import { getAdminDB } from "@/lib/firebase-admin";
import { handleFirestoreError } from "./utils";
import type { SupplierTerms, SupplierTermsSummary } from "@/types/business-health";

const COLLECTION = "supplierTerms";

export async function addSupplierTerms(
  uid: string,
  terms: Omit<SupplierTerms, "id" | "createdAt" | "updatedAt">
): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection(COLLECTION).doc();
    const now = new Date().toISOString();
    await ref.set({ ...terms, id: ref.id, createdAt: now, updatedAt: now });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addSupplierTerms", error);
    return undefined;
  }
}

export async function getSupplierTerms(uid: string): Promise<SupplierTerms[]> {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users").doc(uid).collection(COLLECTION)
      .orderBy("updatedAt", "desc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupplierTerms[];
  } catch (error) {
    handleFirestoreError("getSupplierTerms", error);
    return [];
  }
}

export async function getSupplierTermsById(uid: string, termsId: string): Promise<SupplierTerms | null> {
  try {
    const db = await getAdminDB();
    const doc = await db.collection("users").doc(uid).collection(COLLECTION).doc(termsId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as SupplierTerms;
  } catch (error) {
    handleFirestoreError("getSupplierTermsById", error);
    return null;
  }
}

export async function updateSupplierTerms(
  uid: string,
  termsId: string,
  updates: Partial<Omit<SupplierTerms, "id" | "createdAt">>
): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(COLLECTION).doc(termsId).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError("updateSupplierTerms", error);
    return false;
  }
}

export async function deleteSupplierTerms(uid: string, termsId: string): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(COLLECTION).doc(termsId).delete();
    return true;
  } catch (error) {
    handleFirestoreError("deleteSupplierTerms", error);
    return false;
  }
}

export async function getSupplierTermsSummary(uid: string): Promise<SupplierTermsSummary> {
  try {
    const terms = await getSupplierTerms(uid);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const withContracts = terms.filter((t) => t.contractStart && t.contractEnd).length;
    const expiringSoon = terms.filter((t) => {
      if (!t.contractEnd) return false;
      const endDate = new Date(t.contractEnd);
      return endDate <= thirtyDaysFromNow && endDate >= now;
    }).length;

    const avgPaymentDays = terms.length > 0
      ? Math.round(terms.reduce((sum, t) => {
          const method = t.paymentTerms.method;
          if (method === "net_15") return sum + 15;
          if (method === "net_30") return sum + 30;
          if (method === "net_45") return sum + 45;
          if (method === "net_60") return sum + 60;
          return sum + 0; // prepaid, cod, escrow
        }, 0) / terms.length)
      : 0;

    const avgReturnWindow = terms.length > 0
      ? Math.round(terms.reduce((sum, t) => sum + t.returnPolicy.returnWindowDays, 0) / terms.length)
      : 0;

    return {
      totalSuppliers: terms.length,
      withContracts,
      expiringSoon,
      avgPaymentDays,
      avgReturnWindow,
      complianceRate: terms.length > 0 ? Math.round((withContracts / terms.length) * 100) : 0,
    };
  } catch (error) {
    handleFirestoreError("getSupplierTermsSummary", error);
    return {
      totalSuppliers: 0,
      withContracts: 0,
      expiringSoon: 0,
      avgPaymentDays: 0,
      avgReturnWindow: 0,
      complianceRate: 0,
    };
  }
}
