"use client";

import { useState } from "react";
import { X, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";

interface FulfillmentTemplate {
  id: string;
  name: string;
  description: string;
  supplier: string;
  items: Array<{ name: string; unitCost: number; quantity: number }>;
  shippingMethod: string;
  createdAt: string;
}

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  authFetch: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
  onCreated: (template: FulfillmentTemplate) => void;
}

const SUPPLIERS = ["CJ Dropshipping", "AliExpress", "Amazon", "Alibaba", "Temu", "Manual"];
const SHIPPING_METHODS = ["Standard", "Express", "Economy", "Custom"];

export default function CreateTemplateModal({ isOpen, onClose, authFetch, onCreated }: CreateTemplateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState(SUPPLIERS[0]);
  const [shippingMethod, setShippingMethod] = useState("Standard");
  const [items, setItems] = useState<Array<{ name: string; unitCost: number; quantity: number }>>([
    { name: "", unitCost: 0, quantity: 1 },
  ]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addItem = () => {
    setItems((prev) => [...prev, { name: "", unitCost: 0, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Name is required");
    if (items.length === 0) errs.push("At least one item is required");
    items.forEach((item, i) => {
      if (!item.name.trim()) errs.push(`Item ${i + 1}: name is required`);
      if (item.quantity <= 0) errs.push(`Item ${i + 1}: quantity must be greater than 0`);
    });
    return errs;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    setLoading(true);
    try {
      const body = {
        action: "create",
        template: {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          name: name.trim(),
          description: description.trim(),
          supplier,
          items: items.map((item) => ({
            name: item.name.trim(),
            unitCost: Number(item.unitCost) || 0,
            quantity: Number(item.quantity) || 1,
          })),
          shippingMethod,
          createdAt: new Date().toISOString(),
        },
      };
      const res = await authFetch<{ success?: boolean; template?: FulfillmentTemplate }>("/api/fulfillment/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const template = res?.template || body.template;
      onCreated(template);
      resetForm();
      onClose();
    } catch {
      setErrors(["Failed to create template. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSupplier(SUPPLIERS[0]);
    setShippingMethod("Standard");
    setItems([{ name: "", unitCost: 0, quantity: 1 }]);
    setErrors([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) { resetForm(); onClose(); } }}
    >
      <div className="bg-card border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-sm font-bold text-foreground">Create Fulfillment Template</h2>
          <button onClick={() => { resetForm(); onClose(); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-1">
                <AlertCircle className="h-3 w-3" /> Validation Errors
              </div>
              <ul className="text-[10px] text-red-400 space-y-0.5 ml-5">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Electronics Bundle"
              className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the template..."
              rows={2}
              className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Supplier</label>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
              >
                {SUPPLIERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Shipping Method</label>
              <select
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
              >
                {SHIPPING_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-foreground">Items *</label>
              <button onClick={addItem} className="flex items-center gap-1 text-[10px] text-accent hover:underline">
                <Plus className="h-3 w-3" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface/50 border border-white/5">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(i, "name", e.target.value)}
                    placeholder="Item name"
                    className="flex-1 px-2 py-1.5 bg-surface border border-white/10 rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    value={item.unitCost || ""}
                    onChange={(e) => updateItem(i, "unitCost", parseFloat(e.target.value) || 0)}
                    placeholder="Cost"
                    min={0}
                    step={0.01}
                    className="w-20 px-2 py-1.5 bg-surface border border-white/10 rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    value={item.quantity || ""}
                    onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 0)}
                    placeholder="Qty"
                    min={1}
                    className="w-16 px-2 py-1.5 bg-surface border border-white/10 rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
                  />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Create Template
          </button>
        </div>
      </div>
    </div>
  );
}
