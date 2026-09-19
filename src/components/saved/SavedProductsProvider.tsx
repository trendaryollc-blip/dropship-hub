"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { doc, setDoc, deleteDoc, getDocs, getDoc, writeBatch, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth/AuthProvider";

export interface SavedProduct {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  images?: string[];
  link: string;
  source: string;
  rating?: number;
  reviews?: number;
  savedAt: number;
}

const STORAGE_KEY = "dropship_saved_products";
const TOMBSTONES_KEY = "dropship_saved_tombstones";
// Deletion tombstones live outside the savedProducts collection (in
// savedMeta/tombstones) so the collection snapshot never sees metadata docs.
const MAX_SAVED = 500;
const MAX_TOMBSTONES = 500;
const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface Tombstone { id: string; at: number }

interface SavedProductsContextType {
  savedProducts: SavedProduct[];
  isSaved: (id: string) => boolean;
  toggleSave: (product: SavedProduct) => void;
  removeSaved: (id: string) => void;
  clearSaved: () => void;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  removeSelected: () => void;
  isSelectMode: boolean;
  setSelectMode: (v: boolean) => void;
  /** True when a Firestore sync failed — the UI can surface a retry banner. */
  syncError: boolean;
}

const SavedProductsContext = createContext<SavedProductsContextType | null>(null);

function isValidSavedProduct(p: unknown): p is SavedProduct {
  if (typeof p !== "object" || p === null) return false;
  const item = p as Record<string, unknown>;
  return (
    typeof item.id === "string" && item.id.length > 0 &&
    typeof item.title === "string" &&
    typeof item.savedAt === "number" && Number.isFinite(item.savedAt)
  );
}

function loadLocal(): SavedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Drop malformed entries from older schema versions, cap unbounded growth.
    return parsed
      .filter(isValidSavedProduct)
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, MAX_SAVED);
  } catch {
    return [];
  }
}

function saveLocal(products: SavedProduct[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (e) { console.warn("[SavedProductsProvider] Error:", e instanceof Error ? e.message : e); }
}

function loadLocalTombstones(): Tombstone[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed
      .filter((t): t is Tombstone =>
        typeof t === "object" && t !== null &&
        typeof (t as Tombstone).id === "string" && typeof (t as Tombstone).at === "number")
      .filter((t) => now - t.at < TOMBSTONE_TTL_MS);
  } catch {
    return [];
  }
}

function saveLocalTombstones(tombstones: Tombstone[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(tombstones.slice(-MAX_TOMBSTONES)));
  } catch (e) { console.warn("[SavedProductsProvider] Error:", e instanceof Error ? e.message : e); }
}

function filterTombstoned(products: SavedProduct[], tombstones: Tombstone[]): SavedProduct[] {
  const dead = new Set(tombstones.map((t) => t.id));
  return products.filter((p) => !dead.has(p.id));
}

export function SavedProductsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setSelectMode] = useState(false);
  const [syncError, setSyncError] = useState(false);
  // Tombstones survive in localStorage AND Firestore so a deletion made on
  // device B propagates to device A instead of resurrecting via the merge.
  const tombstonesRef = useRef<Tombstone[]>([]);

  useEffect(() => {
    const local = loadLocal();
    const localTombstones = loadLocalTombstones();
    tombstonesRef.current = localTombstones;
    let cancelled = false;

    if (user) {
      Promise.all([
        getDocs(collection(db, "users", user.uid, "savedProducts")),
        // Remote tombstone doc: { tombstones: [{ id, at }] } — absent for most
        // users; errors here degrade to local-only tombstones.
        getDoc(doc(db, "users", user.uid, "savedMeta", "tombstones")),
      ])
        .then(([snap, tombstoneDoc]) => {
          if (cancelled) return;
          // Merge remote tombstones over local (dedup, keep latest `at`).
          const byId = new Map(tombstonesRef.current.map((t) => [t.id, t]));
          if (tombstoneDoc.exists()) {
            const remoteTombstones = (tombstoneDoc.data().tombstones ?? []) as Tombstone[];
            for (const t of remoteTombstones) {
              if (typeof t?.id === "string" && typeof t?.at === "number" && Date.now() - t.at < TOMBSTONE_TTL_MS) {
                const existing = byId.get(t.id);
                if (!existing || existing.at < t.at) byId.set(t.id, t);
              }
            }
          }
          const tombstones = Array.from(byId.values());
          tombstonesRef.current = tombstones;
          saveLocalTombstones(tombstones);

          const remote: SavedProduct[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: (data.title as string) || "",
              price: (data.price as number | null) ?? null,
              image: (data.image as string | null) ?? null,
              images: (data.images as string[]) || undefined,
              link: (data.link as string) || "",
              source: (data.source as string) || "",
              rating: data.rating as number | undefined,
              reviews: data.reviews as number | undefined,
              savedAt: (data.savedAt as number) || 0,
            };
          });
          // Drop remote items deleted elsewhere (tombstoned), then merge
          // survivors with local (dedup by id, keep newest savedAt).
          const freshRemote = filterTombstoned(remote, tombstones);
          const mergedById = new Map<string, SavedProduct>();
          for (const p of filterTombstoned(local, tombstones)) mergedById.set(p.id, p);
          for (const r of freshRemote) {
            const existing = mergedById.get(r.id);
            if (!existing || r.savedAt >= existing.savedAt) mergedById.set(r.id, r);
          }
          const merged = Array.from(mergedById.values()).sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_SAVED);
          setProducts(merged);
          saveLocal(merged);
        })
        .catch((e) => {
          if (!cancelled) {
            console.warn("[SavedProductsProvider] Error:", e instanceof Error ? e.message : e);
            setSyncError(true);
            setProducts(filterTombstoned(local, tombstonesRef.current));
          }
        });
    } else {
      setProducts(filterTombstoned(local, tombstonesRef.current));
    }

    return () => { cancelled = true; };
  }, [user]);

  const recordTombstone = useCallback((id: string) => {
    const tombstones = [...tombstonesRef.current.filter((t) => t.id !== id), { id, at: Date.now() }];
    tombstonesRef.current = tombstones;
    saveLocalTombstones(tombstones);
    return tombstones;
  }, []);

  const pushRemoteTombstones = useCallback((uid: string) => {
    void setDoc(
      doc(db, "users", uid, "savedMeta", "tombstones"),
      { tombstones: tombstonesRef.current.slice(-MAX_TOMBSTONES) }
    ).catch((e) => {
      console.warn("[SavedProductsProvider] Error:", e instanceof Error ? e.message : e);
      setSyncError(true);
    });
  }, []);

  const toggleSave = useCallback(
    (product: SavedProduct) => {
      let wasSaved = false;
      setProducts((prev) => {
        const exists = prev.some((p) => p.id === product.id);
        wasSaved = exists;
        let next: SavedProduct[];
        if (exists) {
          const tombstones = recordTombstone(product.id);
          next = filterTombstoned(prev, tombstones);
        } else {
          next = [{ ...product, savedAt: Date.now() }, ...prev].slice(0, MAX_SAVED);
        }
        saveLocal(next);
        return next;
      });
      if (user) {
        if (wasSaved) {
          void deleteDoc(doc(db, "users", user.uid, "savedProducts", product.id)).catch((e) => {
            console.warn("[SavedProductsProvider] Error:", e instanceof Error ? e.message : e);
            setSyncError(true);
          });
          pushRemoteTombstones(user.uid);
        } else {
          void setDoc(doc(db, "users", user.uid, "savedProducts", product.id), {
            title: product.title,
            price: product.price ?? null,
            image: product.image ?? null,
            images: product.images || [],
            link: product.link || "",
            source: product.source || "",
            rating: product.rating ?? null,
            reviews: product.reviews ?? null,
            savedAt: Date.now(),
          }).catch((e) => {
            console.warn("[SavedProductsProvider] Error:", e instanceof Error ? e.message : e);
            setSyncError(true);
          });
        }
      }
    },
    [user, recordTombstone, pushRemoteTombstones]
  );

  const removeSaved = useCallback(
    (id: string) => {
      const tombstones = recordTombstone(id);
      setProducts((prev) => {
        const next = filterTombstoned(prev, tombstones);
        saveLocal(next);
        return next;
      });
      if (user) {
        void deleteDoc(doc(db, "users", user.uid, "savedProducts", id)).catch((e) => {
          console.warn("[SavedProductsProvider] Error:", e instanceof Error ? e.message : e);
          setSyncError(true);
        });
        pushRemoteTombstones(user.uid);
      }
    },
    [user, recordTombstone, pushRemoteTombstones]
  );

  const clearSaved = useCallback(() => {
    // Tombstone everything before clearing so other devices converge.
    const now = Date.now();
    const tombstones = [
      ...tombstonesRef.current,
      ...products.map((p) => ({ id: p.id, at: now })),
    ].slice(-MAX_TOMBSTONES);
    tombstonesRef.current = tombstones;
    saveLocalTombstones(tombstones);

    saveLocal([]);
    setProducts([]);

    if (user) {
      // One batched delete (≤450 ops per Firestore batch) instead of N round trips.
      void (async () => {
        try {
          const snap = await getDocs(collection(db, "users", user.uid, "savedProducts"));
          const docs = snap.docs;
          for (let i = 0; i < docs.length; i += 450) {
            const batch = writeBatch(db);
            for (const d of docs.slice(i, i + 450)) {
              batch.delete(d.ref);
            }
            await batch.commit();
          }
          pushRemoteTombstones(user.uid);
        } catch (e) {
          console.warn("[SavedProductsProvider] Error:", e instanceof Error ? e.message : e);
          setSyncError(true);
        }
      })();
    }
  }, [user, products, pushRemoteTombstones]);

  const isSaved = useCallback((id: string) => products.some((p) => p.id === id), [products]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(products.map((p) => p.id)));
  }, [products]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const removeSelected = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    // Batched: one state update + Firestore batches (≤450 ops each) instead of
    // N sequential removeSaved round trips.
    const dead = new Set(ids);
    for (const id of ids) recordTombstone(id);
    setProducts((prev) => {
      const next = prev.filter((p) => !dead.has(p.id));
      saveLocal(next);
      return next;
    });
    setSelectedIds(new Set());
    if (user) {
      void (async () => {
        try {
          for (let i = 0; i < ids.length; i += 450) {
            const batch = writeBatch(db);
            for (const id of ids.slice(i, i + 450)) {
              batch.delete(doc(db, "users", user.uid, "savedProducts", id));
            }
            await batch.commit();
          }
          pushRemoteTombstones(user.uid);
        } catch (e) {
          console.warn("[SavedProductsProvider] Error:", e instanceof Error ? e.message : e);
          setSyncError(true);
        }
      })();
    }
  }, [selectedIds, user, recordTombstone, pushRemoteTombstones]);

  return (
    <SavedProductsContext.Provider
      value={{
        savedProducts: products, isSaved, toggleSave, removeSaved, clearSaved,
        selectedIds, toggleSelect, selectAll, clearSelection, removeSelected,
        isSelectMode, setSelectMode, syncError,
      }}
    >
      {children}
    </SavedProductsContext.Provider>
  );
}

export function useSavedProducts() {
  const ctx = useContext(SavedProductsContext);
  if (!ctx) {
    throw new Error("useSavedProducts must be used within a SavedProductsProvider");
  }
  return ctx;
}
