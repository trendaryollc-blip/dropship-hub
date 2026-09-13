"use client";

import { useState } from "react";
import { X, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import type { FulfillmentRule, RuleCondition, RuleAction, RuleField, RuleOperator } from "@/types/automation";
import { ruleActionLabels } from "./constants";

interface CreateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  authFetch: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
  onCreated: (rule: FulfillmentRule) => void;
}

const RULE_FIELDS: { value: RuleField; label: string }[] = [
  { value: "supplier_id", label: "Supplier ID" },
  { value: "supplier_reliability", label: "Supplier Reliability" },
  { value: "supplier_shipping_days", label: "Supplier Shipping Days" },
  { value: "product_cost", label: "Product Cost" },
  { value: "order_total", label: "Order Total" },
  { value: "customer_country", label: "Customer Country" },
  { value: "customer_state", label: "Customer State" },
  { value: "product_category", label: "Product Category" },
  { value: "stock_level", label: "Stock Level" },
  { value: "profit_margin", label: "Profit Margin" },
  { value: "store_platform", label: "Store Platform" },
  { value: "order_age_hours", label: "Order Age (Hours)" },
];

const RULE_OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "greater_or_equal", label: "Greater or Equal" },
  { value: "less_or_equal", label: "Less or Equal" },
  { value: "contains", label: "Contains" },
  { value: "in_list", label: "In List" },
  { value: "not_in_list", label: "Not In List" },
];

const RULE_ACTION_TYPES: { value: RuleAction["type"]; label: string }[] = [
  { value: "route_to_supplier", label: "Route to Supplier" },
  { value: "set_priority", label: "Set Priority" },
  { value: "auto_approve", label: "Auto-Approve" },
  { value: "require_manual", label: "Require Manual Review" },
  { value: "set_max_cost", label: "Set Max Cost" },
  { value: "notify", label: "Send Notification" },
  { value: "cancel_order", label: "Cancel Order" },
];

const defaultCondition = (): RuleCondition => ({
  field: "order_total",
  operator: "greater_than",
  value: "",
});

const defaultAction = (): RuleAction => ({
  type: "auto_approve",
  params: {},
});

export default function CreateRuleModal({ isOpen, onClose, authFetch, onCreated }: CreateRuleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState(10);
  const [conditions, setConditions] = useState<RuleCondition[]>([defaultCondition()]);
  const [actions, setActions] = useState<RuleAction[]>([defaultAction()]);
  const [fallbackAction, setFallbackAction] = useState<RuleAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addCondition = () => setConditions((prev) => [...prev, defaultCondition()]);
  const removeCondition = (i: number) => setConditions((prev) => prev.filter((_, idx) => idx !== i));
  const updateCondition = (i: number, field: keyof RuleCondition, value: unknown) => {
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const addAction = () => setActions((prev) => [...prev, defaultAction()]);
  const removeAction = (i: number) => setActions((prev) => prev.filter((_, idx) => idx !== i));
  const updateAction = (i: number, type: RuleAction["type"]) => {
    setActions((prev) => prev.map((a, idx) => (idx === i ? { ...a, type } : a)));
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Name is required");
    if (conditions.length === 0) errs.push("At least one condition is required");
    if (actions.length === 0) errs.push("At least one action is required");
    conditions.forEach((c, i) => {
      if (!c.value && c.value !== 0 && c.value !== false) errs.push(`Condition ${i + 1}: value is required`);
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
      const ruleBody = {
        id: `rule_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
        name: name.trim(),
        description: description.trim(),
        enabled,
        priority: Number(priority) || 10,
        conditions: conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
        actions: actions.map((a) => ({
          type: a.type,
          params: a.params,
        })),
        fallbackAction,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const res = await authFetch<{ success?: boolean; rule?: FulfillmentRule }>("/api/fulfillment/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rule: ruleBody }),
      });
      const rule = res?.rule || ruleBody;
      onCreated(rule);
      resetForm();
      onClose();
    } catch {
      setErrors(["Failed to create rule. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setEnabled(true);
    setPriority(10);
    setConditions([defaultCondition()]);
    setActions([defaultAction()]);
    setFallbackAction(null);
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
          <h2 className="text-sm font-bold text-foreground">Create Automation Rule</h2>
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
              placeholder="e.g. High Value Order Review"
              className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the rule..."
              rows={2}
              className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Priority (1-100)</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 10)}
                min={1}
                max={100}
                className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setEnabled(!enabled)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  enabled
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "bg-surface border-white/10 text-muted-foreground"
                }`}
              >
                {enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-foreground">Conditions *</label>
              <button onClick={addCondition} className="flex items-center gap-1 text-[10px] text-accent hover:underline">
                <Plus className="h-3 w-3" /> Add Condition
              </button>
            </div>
            <div className="space-y-2">
              {conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface/50 border border-white/5">
                  <select
                    value={cond.field}
                    onChange={(e) => updateCondition(i, "field", e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-surface border border-white/10 rounded text-xs text-foreground focus:outline-none focus:border-accent"
                  >
                    {RULE_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(i, "operator", e.target.value)}
                    className="w-28 px-2 py-1.5 bg-surface border border-white/10 rounded text-xs text-foreground focus:outline-none focus:border-accent"
                  >
                    {RULE_OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={String(cond.value)}
                    onChange={(e) => updateCondition(i, "value", e.target.value)}
                    placeholder="Value"
                    className="w-24 px-2 py-1.5 bg-surface border border-white/10 rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
                  />
                  {conditions.length > 1 && (
                    <button onClick={() => removeCondition(i)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-foreground">Actions *</label>
              <button onClick={addAction} className="flex items-center gap-1 text-[10px] text-accent hover:underline">
                <Plus className="h-3 w-3" /> Add Action
              </button>
            </div>
            <div className="space-y-2">
              {actions.map((action, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface/50 border border-white/5">
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(i, e.target.value as RuleAction["type"])}
                    className="flex-1 px-2 py-1.5 bg-surface border border-white/10 rounded text-xs text-foreground focus:outline-none focus:border-accent"
                  >
                    {RULE_ACTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {actions.length > 1 && (
                    <button onClick={() => removeAction(i)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fallback Action */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Fallback Action (optional)</label>
            <select
              value={fallbackAction?.type || ""}
              onChange={(e) => setFallbackAction(e.target.value ? { type: e.target.value as RuleAction["type"], params: {} } : null)}
              className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">None</option>
              {RULE_ACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
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
            Create Rule
          </button>
        </div>
      </div>
    </div>
  );
}
