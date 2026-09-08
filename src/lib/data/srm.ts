import { doc, setDoc, collection, query, orderBy, limit, getDocs, where, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import type {
  SupplierMessage, NegotiationRecord, SupplierScorecard,
  AutoSwitchRule, SupplierSwitchLog,
} from "@/types/srm";

// ── Supplier Messages ───────────────────────────────────────────────────────

export async function getSupplierMessages(uid: string, supplierId?: string): Promise<SupplierMessage[]> {
  try {
    let q = query(collection(db, "users", uid, "supplierMessages"), orderBy("createdAt", "desc"), limit(100));
    if (supplierId) {
      q = query(q, where("supplierId", "==", supplierId));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupplierMessage[];
  } catch (error) {
    handleFirestoreError("getSupplierMessages", error);
    return [];
  }
}

export async function addSupplierMessage(uid: string, message: Omit<SupplierMessage, "id">): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "supplierMessages"));
    await setDoc(ref, { ...message, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addSupplierMessage", error);
  }
}

export async function markMessageRead(uid: string, messageId: string): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "supplierMessages", messageId);
    await setDoc(ref, { status: "read", readAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError("markMessageRead", error);
  }
}

export async function deleteSupplierMessage(uid: string, messageId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", uid, "supplierMessages", messageId));
  } catch (error) {
    handleFirestoreError("deleteSupplierMessage", error);
  }
}

// ── Negotiation Records ─────────────────────────────────────────────────────

export async function getNegotiations(uid: string, supplierId?: string): Promise<NegotiationRecord[]> {
  try {
    let q = query(collection(db, "users", uid, "negotiations"), orderBy("updatedAt", "desc"), limit(50));
    if (supplierId) {
      q = query(q, where("supplierId", "==", supplierId));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NegotiationRecord[];
  } catch (error) {
    handleFirestoreError("getNegotiations", error);
    return [];
  }
}

export async function addNegotiation(uid: string, negotiation: Omit<NegotiationRecord, "id">): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "negotiations"));
    await setDoc(ref, { ...negotiation, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addNegotiation", error);
  }
}

export async function updateNegotiation(uid: string, negotiationId: string, updates: Partial<NegotiationRecord>): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "negotiations", negotiationId);
    await setDoc(ref, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError("updateNegotiation", error);
  }
}

// ── Supplier Scorecards ─────────────────────────────────────────────────────

export async function getSupplierScorecards(uid: string): Promise<SupplierScorecard[]> {
  try {
    const q = query(collection(db, "users", uid, "supplierScorecards"), orderBy("overallScore", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as SupplierScorecard));
  } catch (error) {
    handleFirestoreError("getSupplierScorecards", error);
    return [];
  }
}

export async function getSupplierScorecard(uid: string, supplierId: string): Promise<SupplierScorecard | null> {
  try {
    const snap = await getDocs(query(collection(db, "users", uid, "supplierScorecards"), where("supplierId", "==", supplierId), limit(1)));
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as unknown as SupplierScorecard;
  } catch (error) {
    handleFirestoreError("getSupplierScorecard", error);
    return null;
  }
}

export async function saveSupplierScorecard(uid: string, scorecard: SupplierScorecard): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "supplierScorecards", scorecard.supplierId);
    await setDoc(ref, { ...scorecard, lastEvaluated: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError("saveSupplierScorecard", error);
  }
}

// ── Auto-Switch Rules ───────────────────────────────────────────────────────

export async function getAutoSwitchRules(uid: string): Promise<AutoSwitchRule[]> {
  try {
    const q = query(collection(db, "users", uid, "autoSwitchRules"), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AutoSwitchRule[];
  } catch (error) {
    handleFirestoreError("getAutoSwitchRules", error);
    return [];
  }
}

export async function addAutoSwitchRule(uid: string, rule: Omit<AutoSwitchRule, "id">): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "autoSwitchRules"));
    await setDoc(ref, { ...rule, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addAutoSwitchRule", error);
  }
}

export async function updateAutoSwitchRule(uid: string, ruleId: string, updates: Partial<AutoSwitchRule>): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "autoSwitchRules", ruleId);
    await setDoc(ref, updates, { merge: true });
  } catch (error) {
    handleFirestoreError("updateAutoSwitchRule", error);
  }
}

export async function deleteAutoSwitchRule(uid: string, ruleId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", uid, "autoSwitchRules", ruleId));
  } catch (error) {
    handleFirestoreError("deleteAutoSwitchRule", error);
  }
}

// ── Supplier Switch Logs ────────────────────────────────────────────────────

export async function getSupplierSwitchLogs(uid: string, limit_count: number = 20): Promise<SupplierSwitchLog[]> {
  try {
    const q = query(collection(db, "users", uid, "supplierSwitchLogs"), orderBy("switchedAt", "desc"), limit(limit_count));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SupplierSwitchLog[];
  } catch (error) {
    handleFirestoreError("getSupplierSwitchLogs", error);
    return [];
  }
}

export async function addSupplierSwitchLog(uid: string, log: Omit<SupplierSwitchLog, "id">): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "supplierSwitchLogs"));
    await setDoc(ref, { ...log, switchedAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addSupplierSwitchLog", error);
  }
}
