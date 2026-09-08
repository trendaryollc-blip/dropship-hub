"use client";

import { useState } from "react";
import { ShoppingCart, Loader2, Check } from "lucide-react";

interface OrderSampleModalProps {
  productTitle: string;
  productPrice: number;
  ordering: boolean;
  success: boolean;
  onClose: () => void;
  onOrder: (address: { fullName: string; phone: string; street: string; city: string; state: string; zipCode: string; country: string }) => void;
}

export default function OrderSampleModal({ productTitle, productPrice, ordering, success, onClose, onOrder }: OrderSampleModalProps) {
  const [form, setForm] = useState({
    fullName: "", phone: "", street: "", city: "", state: "", zipCode: "", country: "US",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOrder(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Order Placed!</h3>
            <p className="text-sm text-muted-foreground">Your sample order has been placed via CJ Dropshipping.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Order Sample</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="bg-surface-secondary rounded-xl p-3 mb-4">
              <p className="text-sm font-medium truncate">{productTitle}</p>
              <p className="text-emerald-400 font-semibold">${productPrice.toFixed(2)} × 1</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder="Full Name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
              <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
              <input type="text" placeholder="Street Address" required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
                <input type="text" placeholder="State" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="ZIP Code" required value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} className="bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
                <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                </select>
              </div>
              <button type="submit" disabled={ordering} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {ordering ? <><Loader2 className="h-4 w-4 animate-spin" /> Placing Order...</> : <><ShoppingCart className="h-4 w-4" /> Order Sample — ${productPrice.toFixed(2)}</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
