"use client";

import { Loader2, Plus, LayoutTemplate } from "lucide-react";

interface FulfillmentTemplate {
  id: string;
  name: string;
  description: string;
  supplier: string;
  items: Array<{ name: string; unitCost: number; quantity: number }>;
  shippingMethod: string;
  createdAt: string;
}

export default function TemplatesTab({ templates, loading }: { templates: FulfillmentTemplate[]; loading: boolean }) {
  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-accent animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{templates.length} templates saved</p>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-all">
          <Plus className="h-3 w-3" /> New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8">
          <LayoutTemplate className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No fulfillment templates yet</p>
          <p className="text-[10px] text-muted-foreground mt-1">Create templates for recurring order patterns</p>
        </div>
      ) : (
        templates.map((tpl) => (
          <div key={tpl.id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-xs font-semibold text-foreground">{tpl.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{tpl.description}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                {tpl.supplier}
              </span>
            </div>

            <div className="mt-3 space-y-1">
              {tpl.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-surface/50 text-[10px]">
                  <span className="text-foreground">{item.name} x{item.quantity}</span>
                  <span className="text-muted-foreground">${(item.unitCost * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
              <span className="text-[10px] text-muted-foreground">Shipping: {tpl.shippingMethod}</span>
              <span className="text-[10px] text-muted-foreground">
                Created {new Date(tpl.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
