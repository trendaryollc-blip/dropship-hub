"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  ArrowUpRight,
  Zap,
  Trash2,
  Loader2,
  Save,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { AIProvider } from "./constants";

type SlotKey = string;

function slotId(provider: string, index: number): SlotKey {
  return `${provider}:${index}`;
}

interface ProvidersTabProps {
  providers: AIProvider[];
  apiKeys: Record<string, string[]>;
  showKeys: Record<SlotKey, boolean>;
  savedSlots: Record<SlotKey, { masked: string } | null>;
  slotTestStatus: Record<SlotKey, { success: boolean; message: string }>;
  testingSlot: { provider: string; index: number } | null;
  savingSlot: { provider: string; index: number } | null;
  onToggleActive: (id: string) => void;
  onPriorityChange: (id: string, newPriority: number) => void;
  onSaveApiKey: (provider: string, key: string, index: number) => void;
  onAddAdditionalKey: (provider: string) => void;
  onTestConnection: (provider: string, index: number) => void;
  onDeleteApiKey: (provider: string, index: number) => void;
  onShowKeys: (slotKey: SlotKey) => void;
  onApiKeyChange: (id: string, value: string, index: number) => void;
}

export default function ProvidersTab({
  providers,
  apiKeys,
  showKeys,
  savedSlots,
  slotTestStatus,
  testingSlot,
  savingSlot,
  onToggleActive,
  onPriorityChange,
  onSaveApiKey,
  onAddAdditionalKey,
  onTestConnection,
  onDeleteApiKey,
  onShowKeys,
  onApiKeyChange,
}: ProvidersTabProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {[...providers]
        .sort((a, b) => a.priority - b.priority)
        .map((provider) => {
          const keyCount = Object.keys(savedSlots).filter(
            (k) => k.startsWith(`${provider.id}:`) && savedSlots[k] !== null
          ).length;
          const isExpanded = expanded.has(provider.id);

          return (
            <div key={provider.id} className="glass rounded-2xl border border-border group hover:border-accent/10 transition-all overflow-hidden">
              {/* Collapsible Header */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleExpand(provider.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(provider.id); } }}
                className="w-full p-6 text-left flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 cursor-pointer hover:bg-surface/30 transition-colors"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-semibold text-foreground">{provider.name}</h3>
                    {provider.configured ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Configured
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20">
                        Not configured
                      </span>
                    )}
                    {keyCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-400/10 text-blue-400 border border-blue-400/20">
                        {keyCount} key{keyCount > 1 ? "s" : ""} saved
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">Priority: {provider.priority}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{provider.description}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Used for: <span className="text-foreground/70">{provider.usedFor}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={provider.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-surface border border-border text-muted-foreground hover:text-foreground hover:border-accent/20 transition-colors flex items-center gap-1.5">
                    Get API Key <ExternalLink className="h-3 w-3" />
                  </a>
                  <button onClick={(e) => { e.stopPropagation(); onToggleActive(provider.id); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${provider.active ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : "bg-surface text-muted-foreground border border-border"}`}>
                    {provider.active ? "Active" : "Disabled"}
                  </button>
                  <div className="ml-1 text-muted-foreground">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              {/* Expandable Content */}
              {isExpanded && (
                <div className="px-6 pb-6 space-y-4 border-t border-border/50">
                  <div className="flex flex-wrap gap-2 pt-4">
                    {provider.features.map((feature) => (
                      <span key={feature} className="px-2 py-1 rounded-lg text-xs bg-surface text-muted-foreground border border-border">{feature}</span>
                    ))}
                  </div>

                  {/* API Key Inputs */}
                  <div className="space-y-3">
                    {provider.freeTier && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Free tier: <span className="text-foreground">{provider.freeTier}</span></span>
                      </div>
                    )}
                    
                    {apiKeys[provider.id]?.map((_, index) => {
                      const sid = slotId(provider.id, index);
                      const saved = savedSlots[sid];
                      const test = slotTestStatus[sid];
                      const isSavingThis = savingSlot?.provider === provider.id && savingSlot?.index === index;
                      const isTestingThis = testingSlot?.provider === provider.id && testingSlot?.index === index;
                      const hasInput = !!(apiKeys[provider.id]?.[index]?.trim());

                      return (
                        <div key={index} className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type={showKeys[sid] ? "text" : "password"}
                                placeholder={
                                  saved
                                    ? `${saved.masked} — type new key to replace`
                                    : index === 0
                                      ? provider.envKey
                                      : `Additional key ${index + 1}`
                                }
                                value={apiKeys[provider.id]?.[index] || ""}
                                onChange={(e) => onApiKeyChange(provider.id, e.target.value, index)}
                                className="w-full px-3 py-2 pr-9 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/50 font-mono focus:outline-none focus:border-accent/30 transition-all"
                              />
                              <button
                                onClick={() => onShowKeys(sid)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showKeys[sid] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <button
                              onClick={() => onSaveApiKey(provider.id, apiKeys[provider.id]?.[index] || "", index)}
                              disabled={!hasInput || isSavingThis}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all disabled:opacity-50 shrink-0"
                            >
                              {isSavingThis ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Save
                            </button>
                            <button
                              onClick={() => onTestConnection(provider.id, index)}
                              disabled={(!hasInput && !saved) || isTestingThis}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all disabled:opacity-50 shrink-0"
                            >
                              {isTestingThis ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Zap className="h-3.5 w-3.5" />
                              )}
                              Test
                            </button>
                            {saved && (
                              <button
                                onClick={() => onDeleteApiKey(provider.id, index)}
                                className="flex items-center gap-1 px-2 py-2 rounded-xl bg-surface border border-red-400/20 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          {/* Per-slot status line */}
                          {test && (
                            <div className={`text-xs pl-1 ${test.success ? "text-emerald-400" : "text-red-400"}`}>
                              {test.message}
                            </div>
                          )}
                          {!test && saved && (
                            <div className="text-xs pl-1 text-emerald-400/70">
                              Saved ({saved.masked})
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => onAddAdditionalKey(provider.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Another Key
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border/50">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Free tier: <span className="text-foreground">{provider.freeTier}</span></span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <select value={provider.priority}
                        onChange={(e) => onPriorityChange(provider.id, Number(e.target.value))}
                        className="px-2 py-1 rounded-lg text-xs bg-surface border border-border text-foreground">
                        {Array.from({ length: providers.length }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>Priority {num}</option>
                        ))}
                      </select>
                      <Link href={provider.href}
                        className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors">
                        Use it <ArrowUpRight className="h-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
