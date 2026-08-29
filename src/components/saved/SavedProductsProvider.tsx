"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { doc, setDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
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

interface SavedProductsContextType {
  savedProducts: SavedProduct[];
  isSaved: (id: string) => boolean;
  toggleSave: (product: SavedProduct) => void;
  removeSaved: (id: string) => void;
  clearSaved: () => void;
}

const SavedProductsContext = createContext<SavedProductsContextType | null>(null);

function loadLocal(): SavedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocal(products: SavedProduct[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {}
}

export function SavedProductsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<SavedProduct[]>([]);

  useEffect(() => {
    const local = loadLocal();

    if (user) {
      getDocs(collection(db, "users", user.uid, "savedProducts"))
        .then((snap) => {
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
          const merged = [...local];
          const seen = new Set(local.map((p) => p.id));
          for (const r of remote) {
            if (!seen.has(r.id)) merged.push(r);
          }
          merged.sort((a, b) => b.savedAt - a.savedAt);
          setProducts(merged);
          saveLocal(merged);
        })
        .catch(() => {
          setProducts(local);
        });
    } else {
      setProducts(local);
    }
  }, [user?.uid]);

  const toggleSave = useCallback(
    (product: SavedProduct) => {
      setProducts((prev) => {
        const exists = prev.some((p) => p.id === product.id);
        let next: SavedProduct[];
        if (exists) {
          next = prev.filter((p) => p.id !== product.id);
          if (user) {
            void deleteDoc(doc(db, "users", user.uid, "savedProducts", product.id)).catch(() => {});
          }
        } else {
          next = [{ ...product, savedAt: Date.now() }, ...prev];
          if (user) {
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
            }).catch(() => {});
          }
        }
        saveLocal(next);
        return next;
      });
    },
    [user]
  );

  const removeSaved = useCallback(
    (id: string) => {
      setProducts((prev) => {
        const next = prev.filter((p) => p.id !== id);
        saveLocal(next);
        return next;
      });
      if (user) {
        void deleteDoc(doc(db, "users", user.uid, "savedProducts", id)).catch(() => {});
      }
    },
    [user]
  );

  const clearSaved = useCallback(() => {
    saveLocal([]);
    setProducts([]);
    if (user) {
      void getDocs(collection(db, "users", user.uid, "savedProducts"))
        .then((snap) => {
          for (const d of snap.docs) {
            void deleteDoc(doc(db, "users", user.uid, "savedProducts", d.id)).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const isSaved = useCallback((id: string) => products.some((p) => p.id === id), [products]);

  return (
    <SavedProductsContext.Provider
      value={{ savedProducts: products, isSaved, toggleSave, removeSaved, clearSaved }}
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
