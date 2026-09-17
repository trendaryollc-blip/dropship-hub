"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Package, Edit2 } from "lucide-react";
import type { CustomsItem } from "@/types/shipping";
import { COUNTRIES } from "@/lib/shipping/countries";

interface CustomsItemEditorProps {
  items: CustomsItem[];
  onChange: (items: CustomsItem[]) => void;
}

interface ItemForm {
  name: string;
  hsCode: string;
  quantity: string;
  unitValue: string;
  weightKg: string;
  originCountry: string;
}

const emptyForm: ItemForm = {
  name: "",
  hsCode: "",
  quantity: "1",
  unitValue: "",
  weightKg: "0.2",
  originCountry: "CN",
};

const ITEM_PRESETS: Partial<ItemForm>[] = [
  { name: "Wireless Earbuds", hsCode: "8518", unitValue: "25", weightKg: "0.2" },
  { name: "Phone Case", hsCode: "3926", unitValue: "5", weightKg: "0.05" },
  { name: "T-Shirt", hsCode: "6110", unitValue: "12", weightKg: "0.2" },
  { name: "Sneakers", hsCode: "6402", unitValue: "35", weightKg: "0.8" },
  { name: "Laptop Bag", hsCode: "4202", unitValue: "20", weightKg: "0.5" },
  { name: "Smartwatch", hsCode: "9102", unitValue: "45", weightKg: "0.15" },
  { name: "USB Cable", hsCode: "8544", unitValue: "3", weightKg: "0.05" },
  { name: "LED Lamp", hsCode: "9405", unitValue: "15", weightKg: "0.6" },
  { name: "Makeup Set", hsCode: "3304", unitValue: "18", weightKg: "0.3" },
  { name: "Backpack", hsCode: "4202", unitValue: "22", weightKg: "0.7" },
];

export default function CustomsItemEditor({ items, onChange }: CustomsItemEditorProps) {
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const addItem = () => {
    if (!form.name || !form.unitValue) return;
    const newItem: CustomsItem = {
      name: form.name,
      hsCode: form.hsCode || "9999",
      quantity: parseInt(form.quantity) || 1,
      unitValue: parseFloat(form.unitValue) || 0,
      weightKg: parseFloat(form.weightKg) || 0.2,
      originCountry: form.originCountry,
    };

    if (editIndex !== null) {
      const next = [...items];
      next[editIndex] = newItem;
      onChange(next);
      setEditIndex(null);
    } else {
      onChange([...items, newItem]);
    }
    setForm(emptyForm);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    if (editIndex === index) {
      setEditIndex(null);
      setForm(emptyForm);
    }
  };

  const editItem = (index: number) => {
    const item = items[index];
    setForm({
      name: item.name,
      hsCode: item.hsCode,
      quantity: String(item.quantity),
      unitValue: String(item.unitValue),
      weightKg: String(item.weightKg),
      originCountry: item.originCountry,
    });
    setEditIndex(index);
  };

  const applyPreset = (preset: Partial<ItemForm>) => {
    setForm((prev) => ({ ...prev, ...preset }));
    setShowPresets(false);
  };

  const totalValue = items.reduce((sum, item) => sum + item.unitValue * item.quantity, 0);
  const totalWeight = items.reduce((sum, item) => sum + item.weightKg * item.quantity, 0);

  return (
    <div className="space-y-3">
      {/* Presets */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowPresets(!showPresets)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium text-accent bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-all"
        >
          <Package className="h-3 w-3" /> Add from Preset
        </motion.button>
        <AnimatePresence>
          {showPresets && (
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              className="absolute z-20 mt-1 w-64 glass rounded-xl border border-white/10 shadow-xl p-1.5"
            >
              {ITEM_PRESETS.map((preset, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.05)" }}
                  onClick={() => applyPreset(preset)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] text-foreground transition-all text-left"
                >
                  <span>{preset.name}</span>
                  <span className="text-muted-foreground">${preset.unitValue}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Item Form */}
      <motion.div
        layout
        className="glass rounded-xl p-3 space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {editIndex !== null ? "Edit Item" : "Add Item"}
          </h4>
          {editIndex !== null && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setEditIndex(null); setForm(emptyForm); }}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="text-[9px] text-muted-foreground mb-0.5 block font-medium">Item Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Wireless Earbuds"
              className="w-full px-2.5 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground mb-0.5 block font-medium">HS Code</label>
            <input
              value={form.hsCode}
              onChange={(e) => setForm({ ...form, hsCode: e.target.value })}
              placeholder="8518"
              className="w-full px-2.5 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground mb-0.5 block font-medium">Quantity</label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground mb-0.5 block font-medium">Unit Value (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.unitValue}
              onChange={(e) => setForm({ ...form, unitValue: e.target.value })}
              placeholder="25.00"
              className="w-full px-2.5 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground mb-0.5 block font-medium">Weight (kg)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground mb-0.5 block font-medium">Origin</label>
            <select
              value={form.originCountry}
              onChange={(e) => setForm({ ...form, originCountry: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={addItem}
          disabled={!form.name || !form.unitValue}
          className="w-full py-1.5 bg-accent text-white rounded-lg text-[11px] font-medium hover:bg-accent/90 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          {editIndex !== null ? (
            <>Save Changes</>
          ) : (
            <><Plus className="h-3 w-3" /> Add Item</>
          )}
        </motion.button>
      </motion.div>

      {/* Items List */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-1.5"
          >
            {items.map((item, i) => (
              <motion.div
                key={`${item.name}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: i * 0.05 }}
                layout
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                  editIndex === i ? "border-accent/30 bg-accent/5" : "border-white/5 bg-surface/30 hover:bg-surface/50 hover:border-white/10"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-foreground truncate">{item.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground shrink-0">HS: {item.hsCode}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[9px] text-muted-foreground">Qty: {item.quantity}</span>
                    <span className="text-[9px] text-muted-foreground">${item.unitValue.toFixed(2)}/ea</span>
                    <span className="text-[9px] text-accent font-semibold">${(item.unitValue * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => editItem(i)}
                    className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Edit2 className="h-3 w-3" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeItem(i)}
                    className="p-1 rounded hover:bg-red-400/10 text-muted-foreground hover:text-red-400 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </motion.button>
                </div>
              </motion.div>
            ))}

            {/* Totals */}
            <motion.div
              layout
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface/50 border border-white/5"
            >
              <span className="text-[10px] text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground">{totalWeight.toFixed(2)} kg</span>
                <span className="text-[11px] font-bold text-accent">${totalValue.toFixed(2)}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
