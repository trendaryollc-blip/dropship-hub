import { getAdminDB } from "@/lib/firebase-admin";
import { handleFirestoreError } from "./utils";
import type {
  SupplierMessage, NegotiationRecord, SupplierScorecard,
  AutoSwitchRule, SupplierSwitchLog,
} from "@/types/srm";

// ── Supplier Messages ───────────────────────────────────────────────────────

export async function getSupplierMessages(uid: string, supplierId?: string): Promise<SupplierMessage[]> {
  try {
    const db = await getAdminDB();
    let q = db.collection("users").doc(uid).collection("supplierMessages").orderBy("createdAt", "desc").limit(100);
    if (supplierId) {
      q = q.where("supplierId", "==", supplierId);
    }
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupplierMessage[];
  } catch (error) {
    handleFirestoreError("getSupplierMessages", error);
    return [];
  }
}

export async function addSupplierMessage(uid: string, message: Omit<SupplierMessage, "id">): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("supplierMessages").doc();
    await ref.set({ ...message, createdAt: new Date().toISOString() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addSupplierMessage", error);
  }
}

export async function markMessageRead(uid: string, messageId: string): Promise<void> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("supplierMessages").doc(messageId);
    await ref.set({ status: "read", readAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError("markMessageRead", error);
  }
}

export async function deleteSupplierMessage(uid: string, messageId: string): Promise<void> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("supplierMessages").doc(messageId).delete();
  } catch (error) {
    handleFirestoreError("deleteSupplierMessage", error);
  }
}

// ── Negotiation Records ─────────────────────────────────────────────────────

export async function getNegotiations(uid: string, supplierId?: string): Promise<NegotiationRecord[]> {
  try {
    const db = await getAdminDB();
    let q = db.collection("users").doc(uid).collection("negotiations").orderBy("updatedAt", "desc").limit(50);
    if (supplierId) {
      q = q.where("supplierId", "==", supplierId);
    }
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NegotiationRecord[];
  } catch (error) {
    handleFirestoreError("getNegotiations", error);
    return [];
  }
}

export async function addNegotiation(uid: string, negotiation: Omit<NegotiationRecord, "id">): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("negotiations").doc();
    await ref.set({ ...negotiation, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addNegotiation", error);
  }
}

export async function updateNegotiation(uid: string, negotiationId: string, updates: Partial<NegotiationRecord>): Promise<void> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("negotiations").doc(negotiationId);
    await ref.set({ ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError("updateNegotiation", error);
  }
}

// ── Supplier Scorecards ─────────────────────────────────────────────────────

export async function getSupplierScorecards(uid: string): Promise<SupplierScorecard[]> {
  try {
    const db = await getAdminDB();
    const q = db.collection("users").doc(uid).collection("supplierScorecards").orderBy("overallScore", "desc").limit(50);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown as SupplierScorecard[];
  } catch (error) {
    handleFirestoreError("getSupplierScorecards", error);
    return [];
  }
}

export async function getSupplierScorecard(uid: string, supplierId: string): Promise<SupplierScorecard | null> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("supplierScorecards").where("supplierId", "==", supplierId).limit(1).get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as unknown as SupplierScorecard;
  } catch (error) {
    handleFirestoreError("getSupplierScorecard", error);
    return null;
  }
}

export async function saveSupplierScorecard(uid: string, scorecard: SupplierScorecard): Promise<void> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("supplierScorecards").doc(scorecard.supplierId);
    await ref.set({ ...scorecard, lastEvaluated: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError("saveSupplierScorecard", error);
  }
}

// ── Auto-Switch Rules ───────────────────────────────────────────────────────

export async function getAutoSwitchRules(uid: string): Promise<AutoSwitchRule[]> {
  try {
    const db = await getAdminDB();
    const q = db.collection("users").doc(uid).collection("autoSwitchRules").orderBy("createdAt", "desc").limit(50);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AutoSwitchRule[];
  } catch (error) {
    handleFirestoreError("getAutoSwitchRules", error);
    return [];
  }
}

export async function addAutoSwitchRule(uid: string, rule: Omit<AutoSwitchRule, "id">): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("autoSwitchRules").doc();
    await ref.set({ ...rule, createdAt: new Date().toISOString() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addAutoSwitchRule", error);
  }
}

export async function updateAutoSwitchRule(uid: string, ruleId: string, updates: Partial<AutoSwitchRule>): Promise<void> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("autoSwitchRules").doc(ruleId);
    await ref.set(updates, { merge: true });
  } catch (error) {
    handleFirestoreError("updateAutoSwitchRule", error);
  }
}

export async function deleteAutoSwitchRule(uid: string, ruleId: string): Promise<void> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("autoSwitchRules").doc(ruleId).delete();
  } catch (error) {
    handleFirestoreError("deleteAutoSwitchRule", error);
  }
}

// ── Supplier Switch Logs ────────────────────────────────────────────────────

export async function getSupplierSwitchLogs(uid: string, limit_count: number = 20): Promise<SupplierSwitchLog[]> {
  try {
    const db = await getAdminDB();
    const q = db.collection("users").doc(uid).collection("supplierSwitchLogs").orderBy("switchedAt", "desc").limit(limit_count);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupplierSwitchLog[];
  } catch (error) {
    handleFirestoreError("getSupplierSwitchLogs", error);
    return [];
  }
}

export async function addSupplierSwitchLog(uid: string, log: Omit<SupplierSwitchLog, "id">): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("supplierSwitchLogs").doc();
    await ref.set({ ...log, switchedAt: new Date().toISOString() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addSupplierSwitchLog", error);
  }
}
