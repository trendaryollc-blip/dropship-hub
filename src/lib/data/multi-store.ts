import { doc, setDoc, collection, query, orderBy, limit, getDocs, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import type { UnifiedOrder, StoreInventoryItem, StorePerformance, BulkPushJob, InventorySyncLog } from "@/types/multi-store";

// ── Unified Orders ──────────────────────────────────────────────────────────

export async function getUnifiedOrders(uid: string, filters?: { storeId?: string; status?: string; limit?: number }): Promise<UnifiedOrder[]> {
  try {
    let q = query(collection(db, "users", uid, "unifiedOrders"), orderBy("createdAt", "desc"));
    if (filters?.storeId) {
      q = query(q, where("storeId", "==", filters.storeId));
    }
    if (filters?.status) {
      q = query(q, where("status", "==", filters.status));
    }
    q = query(q, limit(filters?.limit || 100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as UnifiedOrder[];
  } catch (error) {
    handleFirestoreError("getUnifiedOrders", error);
    return [];
  }
}

export async function addUnifiedOrder(uid: string, order: Omit<UnifiedOrder, "id">): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "unifiedOrders"));
    await setDoc(ref, { ...order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addUnifiedOrder", error);
  }
}

export async function updateUnifiedOrder(uid: string, orderId: string, updates: Partial<UnifiedOrder>): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "unifiedOrders", orderId);
    await setDoc(ref, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError("updateUnifiedOrder", error);
  }
}

// ── Cross-Store Inventory ───────────────────────────────────────────────────

export async function getStoreInventory(uid: string): Promise<StoreInventoryItem[]> {
  try {
    const q = query(collection(db, "users", uid, "storeInventory"), orderBy("lastSyncedAt", "desc"), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as StoreInventoryItem[];
  } catch (error) {
    handleFirestoreError("getStoreInventory", error);
    return [];
  }
}

export async function upsertStoreInventory(uid: string, item: StoreInventoryItem): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "storeInventory", item.id);
    await setDoc(ref, { ...item, lastSyncedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError("upsertStoreInventory", error);
  }
}

export async function syncInventoryAcrossStores(uid: string, productId: string, sourceStoreId: string, newStock: number): Promise<void> {
  try {
    const inventoryRef = collection(db, "users", uid, "storeInventory");
    const q = query(inventoryRef, where("productId", "==", productId));
    const snap = await getDocs(q);

    for (const docSnap of snap.docs) {
      const item = docSnap.data() as StoreInventoryItem;
      const updatedStores = item.stores.map((s) => {
        if (s.storeId === sourceStoreId) {
          return { ...s, stock: newStock, lastUpdated: new Date().toISOString() };
        }
        return s;
      });
      const totalStock = updatedStores.reduce((sum, s) => sum + s.stock, 0);
      await setDoc(docSnap.ref, { stores: updatedStores, totalStock, lastSyncedAt: new Date().toISOString() }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError("syncInventoryAcrossStores", error);
  }
}

export async function addInventorySyncLog(uid: string, log: Omit<InventorySyncLog, "id">): Promise<void> {
  try {
    const ref = doc(collection(db, "users", uid, "inventorySyncLogs"));
    await setDoc(ref, { ...log, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addInventorySyncLog", error);
  }
}

export async function getInventorySyncLogs(uid: string, limit_count: number = 50): Promise<InventorySyncLog[]> {
  try {
    const q = query(collection(db, "users", uid, "inventorySyncLogs"), orderBy("createdAt", "desc"), limit(limit_count));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InventorySyncLog[];
  } catch (error) {
    handleFirestoreError("getInventorySyncLogs", error);
    return [];
  }
}

// ── Store Performance ───────────────────────────────────────────────────────

export async function getStorePerformances(uid: string, period: "7d" | "30d" | "90d" = "30d"): Promise<StorePerformance[]> {
  try {
    const q = query(
      collection(db, "users", uid, "storePerformances"),
      where("period", "==", period),
      orderBy("metrics.totalRevenue", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown as StorePerformance[];
  } catch (error) {
    handleFirestoreError("getStorePerformances", error);
    return [];
  }
}

export async function saveStorePerformance(uid: string, performance: StorePerformance): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "storePerformances", `${performance.storeId}_${performance.period}`);
    await setDoc(ref, performance, { merge: true });
  } catch (error) {
    handleFirestoreError("saveStorePerformance", error);
  }
}

// ── Bulk Push Jobs ──────────────────────────────────────────────────────────

export async function getBulkPushJobs(uid: string): Promise<BulkPushJob[]> {
  try {
    const q = query(collection(db, "users", uid, "bulkPushJobs"), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as BulkPushJob[];
  } catch (error) {
    handleFirestoreError("getBulkPushJobs", error);
    return [];
  }
}

export async function addBulkPushJob(uid: string, job: Omit<BulkPushJob, "id">): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "bulkPushJobs"));
    await setDoc(ref, { ...job, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addBulkPushJob", error);
  }
}

export async function updateBulkPushJob(uid: string, jobId: string, updates: Partial<BulkPushJob>): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "bulkPushJobs", jobId);
    await setDoc(ref, updates, { merge: true });
  } catch (error) {
    handleFirestoreError("updateBulkPushJob", error);
  }
}
