import { doc, setDoc, deleteDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { CSConversationDocSchema, CSMessageDocSchema, CSTemplateDocSchema, AddCSConversationInputSchema, AddCSMessageInputSchema, AddCSTemplateInputSchema } from "./schemas";

export interface CSConversationDoc {
  id: string;
  customerName: string;
  customerEmail: string;
  platform: string;
  status: "active" | "escalated" | "resolved" | "waiting";
  subject: string;
  lastMessage: string;
  messageCount: number;
  aiHandled: boolean;
  createdAt: Timestamp;
}

export async function addCSConversation(uid: string, conv: Omit<CSConversationDoc, "id" | "createdAt">) {
  try {
    const input = AddCSConversationInputSchema.parse(conv);
    const ref = doc(collection(db, "users", uid, "csConversations"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addCSConversation", error);
  }
}

export async function getCSConversations(uid: string): Promise<CSConversationDoc[]> {
  try {
    const q = query(collection(db, "users", uid, "csConversations"), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...CSConversationDocSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getCSConversations", error);
  }
}

export interface CSMessageDoc {
  id: string;
  conversationId: string;
  role: "customer" | "ai" | "agent";
  content: string;
  confidence?: number;
  escalated?: boolean;
  createdAt: Timestamp;
}

export async function addCSMessage(uid: string, msg: Omit<CSMessageDoc, "id" | "createdAt">) {
  try {
    const input = AddCSMessageInputSchema.parse(msg);
    const ref = doc(collection(db, "users", uid, "csMessages"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addCSMessage", error);
  }
}

export async function getCSMessages(uid: string, conversationId: string): Promise<CSMessageDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "csMessages"),
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...CSMessageDocSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getCSMessages", error);
  }
}

export interface CSTemplateDoc {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  variables: string[];
  usageCount: number;
  createdAt: Timestamp;
}

export async function addCSTemplate(uid: string, template: Omit<CSTemplateDoc, "id" | "createdAt">) {
  try {
    const input = AddCSTemplateInputSchema.parse(template);
    const ref = doc(collection(db, "users", uid, "csTemplates"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addCSTemplate", error);
  }
}

export async function getCSTemplates(uid: string): Promise<CSTemplateDoc[]> {
  try {
    const q = query(collection(db, "users", uid, "csTemplates"), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...CSTemplateDocSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getCSTemplates", error);
  }
}

export async function deleteCSTemplate(uid: string, templateId: string) {
  try {
    await deleteDoc(doc(db, "users", uid, "csTemplates", templateId));
  } catch (error) {
    handleFirestoreError("deleteCSTemplate", error);
  }
}
