"use client";

import { X, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

interface CompareItem {
  name: string;
  price: number;
  margin: number;
  image: string;
}

export default function QuickCompareBar({
  items,
  onRemove,
  onClear,
}: {
  items: CompareItem[];
  onRemove: (name: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up-bar">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-4">
        <div className="glass rounded-2xl border border-accent/20 shadow-2xl shadow-accent/5 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <BarChart3 className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-foreground">Compare</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold">
                {items.length}/4
              </span>
            </div>

            <div className="flex items-center gap-3 flex-1 overflow-x-auto">
              {items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface/80 border border-border shrink-0 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate max-w-[100px]">{item.name}</p>
                    <p className="text-[10px] text-emerald-400 font-medium">${item.price} · {item.margin}%</p>
                  </div>
                  <button
                    onClick={() => onRemove(item.name)}
                    className="p-0.5 rounded-md text-muted-foreground/40 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {items.length < 4 && (
                <Link
                  href="/products"
                  className="w-[140px] h-[48px] rounded-xl border border-dashed border-border flex items-center justify-center shrink-0 hover:border-accent/30 hover:bg-accent/5 transition-all"
                >
                  <span className="text-[10px] text-muted-foreground/40 hover:text-accent transition-colors">+ Add product</span>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {items.length >= 2 && (
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-[0.97]">
                  Compare
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={onClear}
                className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="Clear all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
