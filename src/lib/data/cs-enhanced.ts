import { doc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp, where, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { AddKnowledgeBaseInputSchema, AddEscalationRuleInputSchema } from "./schemas";

export interface KnowledgeBaseEntryDoc {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  productId?: string;
  productTitle?: string;
  usageCount: number;
  lastUsed?: string;
  createdAt: Timestamp;
}

export interface EscalationRuleDoc {
  id: string;
  name: string;
  enabled: boolean;
  conditions: Record<string, unknown>;
  action: string;
  priority: string;
  createdAt: Timestamp;
}

export async function addKnowledgeBaseEntry(uid: string, entry: Omit<KnowledgeBaseEntryDoc, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const input = AddKnowledgeBaseInputSchema.parse(entry);
    const ref = doc(collection(db, "users", uid, "csKnowledgeBase"));
    await setDoc(ref, { ...input, usageCount: 0, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addKnowledgeBaseEntry", error);
    return undefined;
  }
}

export async function getKnowledgeBaseEntries(uid: string, category?: string): Promise<KnowledgeBaseEntryDoc[]> {
  try {
    let q;
    if (category) {
      q = query(
        collection(db, "users", uid, "csKnowledgeBase"),
        where("category", "==", category),
        orderBy("createdAt", "desc"),
        limit(100)
      );
    } else {
      q = query(collection(db, "users", uid, "csKnowledgeBase"), orderBy("createdAt", "desc"), limit(100));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as KnowledgeBaseEntryDoc));
  } catch (error) {
    handleFirestoreError("getKnowledgeBaseEntries", error);
    return [];
  }
}

export async function updateKnowledgeBaseEntry(uid: string, entryId: string, updates: Partial<KnowledgeBaseEntryDoc>): Promise<boolean> {
  try {
    const ref = doc(db, "users", uid, "csKnowledgeBase", entryId);
    await updateDoc(ref, updates);
    return true;
  } catch (error) {
    handleFirestoreError("updateKnowledgeBaseEntry", error);
    return false;
  }
}

export async function deleteKnowledgeBaseEntry(uid: string, entryId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "users", uid, "csKnowledgeBase", entryId));
    return true;
  } catch (error) {
    handleFirestoreError("deleteKnowledgeBaseEntry", error);
    return false;
  }
}

export async function addEscalationRule(uid: string, rule: Omit<EscalationRuleDoc, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const input = AddEscalationRuleInputSchema.parse(rule);
    const ref = doc(collection(db, "users", uid, "csEscalationRules"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addEscalationRule", error);
    return undefined;
  }
}

export async function getEscalationRules(uid: string): Promise<EscalationRuleDoc[]> {
  try {
    const q = query(collection(db, "users", uid, "csEscalationRules"), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EscalationRuleDoc));
  } catch (error) {
    handleFirestoreError("getEscalationRules", error);
    return [];
  }
}

export async function updateEscalationRule(uid: string, ruleId: string, updates: Partial<EscalationRuleDoc>): Promise<boolean> {
  try {
    const ref = doc(db, "users", uid, "csEscalationRules", ruleId);
    await updateDoc(ref, updates);
    return true;
  } catch (error) {
    handleFirestoreError("updateEscalationRule", error);
    return false;
  }
}

export async function deleteEscalationRule(uid: string, ruleId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "users", uid, "csEscalationRules", ruleId));
    return true;
  } catch (error) {
    handleFirestoreError("deleteEscalationRule", error);
    return false;
  }
}

export async function incrementKnowledgeBaseUsage(uid: string, entryId: string): Promise<boolean> {
  try {
    const ref = doc(db, "users", uid, "csKnowledgeBase", entryId);
    const { increment } = await import("firebase/firestore");
    await updateDoc(ref, {
      usageCount: increment(1),
      lastUsed: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError("incrementKnowledgeBaseUsage", error);
    return false;
  }
}
