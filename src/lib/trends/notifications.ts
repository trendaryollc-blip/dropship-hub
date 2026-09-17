import { doc, setDoc, getDocs, collection, query, orderBy, limit, where, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError } from "@/lib/data/utils";

export interface TrendNotification {
  id: string;
  type: "rising_star" | "peak_warning" | "saturation_alert" | "new_trend" | "volume_spike" | "prediction_verified";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  keyword?: string;
  category?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Timestamp;
}

export async function createNotification(
  uid: string,
  notification: Omit<TrendNotification, "id" | "createdAt" | "read">
): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "trendNotifications"));
    await setDoc(ref, {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError("createNotification", error);
    return undefined;
  }
}

export async function getNotifications(
  uid: string,
  options: { unreadOnly?: boolean; count?: number } = {}
): Promise<TrendNotification[]> {
  try {
    const { unreadOnly = false, count = 20 } = options;
    let q;
    if (unreadOnly) {
      q = query(
        collection(db, "users", uid, "trendNotifications"),
        where("read", "==", false),
        orderBy("createdAt", "desc"),
        limit(count)
      );
    } else {
      q = query(
        collection(db, "users", uid, "trendNotifications"),
        orderBy("createdAt", "desc"),
        limit(count)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrendNotification));
  } catch (error) {
    handleFirestoreError("getNotifications", error);
    return [];
  }
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<boolean> {
  try {
    const ref = doc(db, "users", uid, "trendNotifications", notificationId);
    await updateDoc(ref, { read: true });
    return true;
  } catch (error) {
    handleFirestoreError("markNotificationRead", error);
    return false;
  }
}

export async function markAllNotificationsRead(uid: string): Promise<boolean> {
  try {
    const notifications = await getNotifications(uid, { unreadOnly: true, count: 100 });
    await Promise.all(
      notifications.map((n) => updateDoc(doc(db, "users", uid, "trendNotifications", n.id), { read: true }))
    );
    return true;
  } catch (error) {
    handleFirestoreError("markAllNotificationsRead", error);
    return false;
  }
}

export async function getUnreadCount(uid: string): Promise<number> {
  try {
    const q = query(
      collection(db, "users", uid, "trendNotifications"),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
}
