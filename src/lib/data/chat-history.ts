import { doc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { ChatMessageSchema, SaveChatMessageInputSchema } from "./schemas";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  timestamp: Timestamp;
}

export async function saveChatMessage(uid: string, msg: Omit<ChatMessage, "id" | "timestamp">) {
  try {
    const input = SaveChatMessageInputSchema.parse(msg);
    const ref = doc(collection(db, "users", uid, "chatHistory"));
    await setDoc(ref, { ...input, timestamp: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("saveChatMessage", error);
  }
}

export async function getChatHistory(uid: string): Promise<ChatMessage[]> {
  try {
    const q = query(
      collection(db, "users", uid, "chatHistory"),
      orderBy("timestamp", "asc"),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...ChatMessageSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getChatHistory", error);
  }
}
