"use client";

import { useState } from "react";
import { Loader2, Shield, ToggleLeft, ToggleRight, Trash2, Plus } from "lucide-react";
import type { FulfillmentRule } from "@/types/automation";
import { ruleActionLabels } from "./constants";

interface RulesTabProps {
  rules: FulfillmentRule[];
  onToggle: (ruleId: string, enabled: boolean) => void;
  loading: boolean;
  onCreateClick: () => void;
  onDelete: (id: string) => void;
}

export default function FulfillmentRulesTab({ rules, onToggle, loading, onCreateClick, onDelete }: RulesTabProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [priorityValue, setPriorityValue] = useState<number>(10);

  const handleDelete = (ruleId: string) => {
    if (confirmDeleteId === ruleId) {
      onDelete(ruleId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(ruleId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const startEditPriority = (rule: FulfillmentRule) => {
    setEditingPriorityId(rule.id);
    setPriorityValue(rule.priority);
  };

  const savePriority = (_ruleId: string) => {
    setEditingPriorityId(null);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-accent animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{rules.length} rules configured</p>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-all"
        >
          <Plus className="h-3 w-3" /> New Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No fulfillment rules yet</p>
        </div>
      ) : (
        rules.map((rule) => (
          <div key={rule.id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-foreground">{rule.name}</h4>
                  {editingPriorityId === rule.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={priorityValue}
                        onChange={(e) => setPriorityValue(parseInt(e.target.value) || 0)}
                        min={0}
                        max={100}
                        className="w-12 px-1.5 py-0.5 bg-surface border border-white/10 rounded text-[10px] text-foreground text-center focus:outline-none focus:border-accent"
                        autoFocus
                      />
                      <button
                        onClick={() => savePriority(rule.id)}
                        className="text-[10px] text-accent hover:underline"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditPriority(rule)}
                      className="text-[10px] text-muted-foreground bg-surface px-1.5 py-0.5 rounded hover:bg-surface/80 transition-all"
                    >
                      P{rule.priority}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{rule.description}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onToggle(rule.id, !rule.enabled)}
                  className="flex-shrink-0"
                >
                  {rule.enabled ? (
                    <ToggleRight className="h-5 w-5 text-accent" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className={`p-1 rounded transition-all ${
                    confirmDeleteId === rule.id
                      ? "text-red-400 bg-red-500/10"
                      : "text-muted-foreground hover:text-red-400"
                  }`}
                  title={confirmDeleteId === rule.id ? "Click again to confirm" : "Delete rule"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mt-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Conditions:</p>
                <div className="flex flex-wrap gap-1">
                  {rule.conditions.map((cond, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-foreground border border-white/5">
                      {cond.field.replace(/_/g, " ")} {cond.operator.replace(/_/g, " ")} {String(cond.value)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Actions:</p>
                <div className="flex flex-wrap gap-1">
                  {rule.actions.map((action, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                      {ruleActionLabels[action.type] || action.type}
                    </span>
                  ))}
                </div>
              </div>
              {rule.fallbackAction && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Fallback:</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400">
                    {ruleActionLabels[rule.fallbackAction.type] || rule.fallbackAction.type}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
