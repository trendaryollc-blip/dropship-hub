"use client";

import { Loader2, Shield, ToggleLeft, ToggleRight } from "lucide-react";
import type { FulfillmentRule } from "@/types/automation";
import { ruleActionLabels } from "./constants";

export default function RulesTab({ rules, onToggle, loading }: { rules: FulfillmentRule[]; onToggle: (ruleId: string, enabled: boolean) => void; loading: boolean }) {
  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-accent animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{rules.length} rules configured</p>
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
                  <span className="text-[10px] text-muted-foreground bg-surface px-1.5 py-0.5 rounded">
                    P{rule.priority}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{rule.description}</p>
              </div>
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
