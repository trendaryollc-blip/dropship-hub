"use client";

import { useState, useEffect } from "react";
import { X, Package, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import { useAPI } from "@/hooks/useAPI";

interface SupplierAssignment {
  supplierId: string;
  supplierName: string;
  unitCost: number;
  shippingCost: number;
  source: string;
}

interface SupplierPickerProps {
  productId: string;
  productName: string;
  onAssigned?: (assignment: SupplierAssignment) => void;
}

export function SupplierPicker({ productId, productName: _productName, onAssigned }: SupplierPickerProps) {
  const { user } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [unitCost, setUnitCost] = useState("0");
  const [shippingCost, setShippingCost] = useState("0");
  const [loading, setLoading] = useState(false);

  const uid = user?.uid || "";
  const { data: supplierData, isLoading: initialLoading } = useAPI<{ assignment?: SupplierAssignment }>(
    uid ? `/api/fulfillment/suppliers?uid=${uid}&productId=${productId}` : null
  );
  const { data: suppliersList, isLoading: suppliersLoading } = useAPI<{ suppliers?: { id: string; name: string }[] }>("/api/suppliers");
  const assignment = supplierData?.assignment || null;

  const availableSuppliers = (suppliersList?.suppliers || []).map((s) => ({
    id: s.id,
    name: s.name,
    color: "bg-accent/20 text-accent",
  }));

  useEffect(() => {
    if (assignment) {
      setUnitCost(String(assignment.unitCost || 0));
      setShippingCost(String(assignment.shippingCost || 0));
    }
  }, [assignment]);

  const handleAssign = async (supplierId: string, supplierName: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await safeFetch("/api/fulfillment/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          productId,
          supplierId,
          supplierName,
          unitCost: parseFloat(unitCost) || 0,
          shippingCost: parseFloat(shippingCost) || 0,
        }),
      });
      const newAssignment = { supplierId, supplierName, unitCost: parseFloat(unitCost) || 0, shippingCost: parseFloat(shippingCost) || 0, source: "manual" };
      setShowPicker(false);
      onAssigned?.(newAssignment);
    } catch (e) { console.warn("[SupplierPicker] Error:", e instanceof Error ? e.message : e); }
    setLoading(false);
  };

  const handleClear = async () => {
    if (!user) return;
    try {
      await safeFetch(`/api/fulfillment/suppliers?uid=${user.uid}&productId=${productId}`, { method: "DELETE" });
    } catch (e) { console.warn("[SupplierPicker] Error:", e instanceof Error ? e.message : e); }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-white/10 rounded-lg">
        <div className="h-4 w-4 rounded bg-white/10 animate-pulse" />
        <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-2 px-3 py-2 bg-surface border border-dashed border-white/20 rounded-lg text-xs text-muted-foreground hover:border-accent hover:text-accent transition-all"
        >
          <Package className="h-3 w-3" />
          Assign Supplier
        </button>
        {showPicker && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-1">
              {suppliersLoading ? (
                <div className="flex items-center justify-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading suppliers...
                </div>
              ) : availableSuppliers.length === 0 ? (
                <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                  No suppliers available
                </div>
              ) : (
                availableSuppliers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleAssign(s.id, s.name)}
                    disabled={loading}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-white/5 rounded transition-colors text-left disabled:opacity-50"
                  >
                    <span className={`w-2 h-2 rounded-full ${s.color.split(" ")[0]}`} />
                    {s.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const supplier = availableSuppliers.find((s) => s.id === assignment.supplierId) || availableSuppliers[0];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs ${supplier?.color || "bg-surface text-muted-foreground"} border-current/20`}>
      <span className={`w-2 h-2 rounded-full ${supplier?.color.split(" ")[0] || "bg-muted-foreground"}`} />
      <span className="font-medium">{supplier?.name || assignment.supplierName}</span>
      <span className="text-muted-foreground">·</span>
      <span>${assignment.unitCost.toFixed(2)}</span>
      <button onClick={handleClear} className="ml-auto text-muted-foreground hover:text-red-400 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
