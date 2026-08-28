"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, X, Package } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const SUPPLIERS = [
  { id: "cj", name: "CJ Dropshipping", color: "bg-blue-500/20 text-blue-400" },
  { id: "aliexpress", name: "AliExpress", color: "bg-orange-500/20 text-orange-400" },
  { id: "alibaba", name: "Alibaba", color: "bg-yellow-500/20 text-yellow-400" },
  { id: "amazon", name: "Amazon", color: "bg-amber-500/20 text-amber-400" },
  { id: "temu", name: "Temu", color: "bg-pink-500/20 text-pink-400" },
  { id: "manual", name: "Manual", color: "bg-gray-500/20 text-gray-400" },
];

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

export function SupplierPicker({ productId, productName, onAssigned }: SupplierPickerProps) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<SupplierAssignment | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [unitCost, setUnitCost] = useState("0");
  const [shippingCost, setShippingCost] = useState("0");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch(`/api/fulfillment/suppliers?uid=${user.uid}&productId=${productId}`);
        const data = await res.json();
        if (data.assignment) {
          setAssignment(data.assignment);
          setUnitCost(String(data.assignment.unitCost || 0));
          setShippingCost(String(data.assignment.shippingCost || 0));
        }
      } catch {} finally {
        setInitialLoading(false);
      }
    })();
  }, [user, productId]);

  const handleAssign = async (supplierId: string, supplierName: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await fetch("/api/fulfillment/suppliers", {
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
      setAssignment(newAssignment);
      setShowPicker(false);
      onAssigned?.(newAssignment);
    } catch {}
    setLoading(false);
  };

  const handleClear = async () => {
    if (!user) return;
    try {
      await fetch(`/api/fulfillment/suppliers?uid=${user.uid}&productId=${productId}`, { method: "DELETE" });
      setAssignment(null);
    } catch {}
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
              {SUPPLIERS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleAssign(s.id, s.name)}
                  disabled={loading}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-white/5 rounded transition-colors text-left disabled:opacity-50"
                >
                  <span className={`w-2 h-2 rounded-full ${s.color.split(" ")[0]}`} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const supplier = SUPPLIERS.find((s) => s.id === assignment.supplierId) || SUPPLIERS[0];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs ${supplier.color} border-current/20`}>
      <span className={`w-2 h-2 rounded-full ${supplier.color.split(" ")[0]}`} />
      <span className="font-medium">{supplier.name}</span>
      <span className="text-muted-foreground">·</span>
      <span>${assignment.unitCost.toFixed(2)}</span>
      <button onClick={handleClear} className="ml-auto text-muted-foreground hover:text-red-400 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
