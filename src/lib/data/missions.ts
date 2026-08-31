import { doc, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { MissionEntrySchema, AddMissionInputSchema } from "./schemas";

export interface MissionEntry {
  id: string;
  text: string;
  done: boolean;
  date: string;
  createdAt: Timestamp;
}

export async function addMission(uid: string, mission: Omit<MissionEntry, "id" | "createdAt">) {
  try {
    const input = AddMissionInputSchema.parse(mission);
    const ref = doc(collection(db, "users", uid, "missions"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addMission", error);
  }
}

export async function getMissions(uid: string, date?: string): Promise<MissionEntry[]> {
  try {
    const today = date || new Date().toISOString().split("T")[0];
    const q = query(
      collection(db, "users", uid, "missions"),
      where("date", "==", today),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...MissionEntrySchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getMissions", error);
  }
}

export async function toggleMission(uid: string, missionId: string, done: boolean) {
  try {
    await updateDoc(doc(db, "users", uid, "missions", missionId), { done });
  } catch (error) {
    handleFirestoreError("toggleMission", error);
  }
}
