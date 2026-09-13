"use client";

import { useState } from "react";
import { Loader2, Plus, LayoutTemplate, Trash2, Play, AlertCircle } from "lucide-react";

interface FulfillmentTemplate {
  id: string;
  name: string;
  description: string;
  supplier: string;
  items: Array<{ name: string; unitCost: number; quantity: number }>;
  shippingMethod: string;
  createdAt: string;
}

interface TemplatesTabProps {
  templates: FulfillmentTemplate[];
  loading: boolean;
  onCreateClick: () => void;
  onDelete: (id: string) => void;
  authFetch: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
}

export default function FulfillmentTemplatesTab({ templates, loading, onCreateClick, onDelete, authFetch }: TemplatesTabProps) {
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [executingResult, setExecutingResult] = useState<string | null>(null);

  const handleExecute = async (templateId: string) => {
    setExecutingId(templateId);
    setExecutingResult(null);
    try {
      const res = await authFetch<{ success?: boolean; batch?: { id: string } }>("/api/fulfillment/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", templateId }),
      });
      setExecutingResult(`Template executed — batch ${res?.batch?.id || "created"}`);
    } catch {
      setExecutingResult("Failed to execute template");
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = (templateId: string) => {
    if (confirmDeleteId === templateId) {
      onDelete(templateId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(templateId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-accent animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{templates.length} templates saved</p>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-all"
        >
          <Plus className="h-3 w-3" /> New Template
        </button>
      </div>

      {executingResult && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent">
          <AlertCircle className="h-3 w-3 shrink-0" /> {executingResult}
          <button onClick={() => setExecutingResult(null)} className="ml-auto text-muted-foreground hover:text-foreground">×</button>
        </div>
      )}

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

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => handleExecute(tpl.id)}
                disabled={executingId === tpl.id}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-accent/10 text-accent rounded-lg text-[10px] font-medium hover:bg-accent/20 transition-all disabled:opacity-50"
              >
                {executingId === tpl.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Execute
              </button>
              <button
                onClick={() => handleDelete(tpl.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                  confirmDeleteId === tpl.id
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-surface text-muted-foreground hover:text-red-400 hover:bg-surface"
                }`}
              >
                <Trash2 className="h-3 w-3" />
                {confirmDeleteId === tpl.id ? "Confirm Delete" : "Delete"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
