"use client";

import { useState } from "react";
import {
  MessageSquare, GitCompare, ArrowRightLeft,
  CheckCircle2, Send, Loader2, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, Plus,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI } from "@/hooks/useAPI";
import { useMutation } from "@/hooks/useAPI";
import type { NegotiationRecord, SupplierMessage, AutoSwitchRule } from "@/types/srm";

function NegotiationsSection({ negotiations, supplierId }: { negotiations: NegotiationRecord[]; supplierId: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filtered = negotiations.filter((n) => n.supplierId === supplierId);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-6">
        <GitCompare className="h-8 w-8 text-neutral-700 mx-auto mb-2" />
        <p className="text-xs text-neutral-400">No negotiations with this supplier yet.</p>
      </div>
    );
  }

  const statusConfig = {
    active: { color: "text-blue-400 bg-blue-400/10 border-blue-400/20", label: "Active" },
    accepted: { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", label: "Accepted" },
    rejected: { color: "text-red-400 bg-red-400/10 border-red-400/20", label: "Rejected" },
    expired: { color: "text-neutral-500 bg-neutral-500/10 border-neutral-500/20", label: "Expired" },
    counter_offered: { color: "text-amber-400 bg-amber-400/10 border-amber-400/20", label: "Counter Offer" },
  };

  return (
    <div className="space-y-3">
      {filtered.map((neg) => {
        const isExpanded = expandedId === neg.id;
        const status = statusConfig[neg.status];
        const savings = neg.initialPrice - (neg.currentOffer || neg.initialPrice);
        return (
          <div key={neg.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : neg.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3 text-left min-w-0">
                <div className="w-8 h-8 rounded-lg bg-violet-400/10 flex items-center justify-center shrink-0">
                  <GitCompare className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{neg.productTitle}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${status.color}`}>{status.label}</span>
                    <span className="text-[9px] text-neutral-500">{neg.rounds.length} rounds</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-xs font-bold text-white">${neg.currentOffer.toFixed(2)}</p>
                  <p className="text-[9px] text-neutral-500">target: ${neg.targetPrice.toFixed(2)}</p>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
              </div>
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-white/[0.06]">
                <div className="mt-3 space-y-2">
                  {neg.rounds.map((round) => (
                    <div key={round.roundNumber} className={`flex gap-3 ${round.initiator === "us" ? "justify-end" : ""}`}>
                      <div className={`max-w-[80%] rounded-xl p-3 ${
                        round.initiator === "us"
                          ? "bg-accent/10 border border-accent/20"
                          : "bg-white/[0.04] border border-white/[0.06]"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] text-neutral-500">Round {round.roundNumber}</span>
                          <span className={`text-[9px] font-medium ${round.initiator === "us" ? "text-accent" : "text-violet-400"}`}>
                            {round.initiator === "us" ? "You" : "Supplier"}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300">{round.message}</p>
                        <p className="text-xs font-bold text-white mt-1">${round.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {savings > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Saved ${(savings * (neg.quantity || 1)).toFixed(2)} total ({((savings / neg.initialPrice) * 100).toFixed(0)}% off)
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MessagesSection({ messages, supplierId }: { messages: SupplierMessage[]; supplierId: string }) {
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const filtered = messages.filter((m) => m.supplierId === supplierId);
  const { trigger: sendMessage, isMutating } = useMutation("/api/srm/messages");

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    await sendMessage({ body: { supplierId, supplierName: "", subject, body, messageType: "general" } });
    setSubject("");
    setBody("");
    setComposing(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-neutral-400">{filtered.length} message{filtered.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setComposing(!composing)}
          className="flex items-center gap-1.5 text-[10px] text-accent hover:text-accent/80 transition-colors"
        >
          <Plus className="h-3 w-3" /> New Message
        </button>
      </div>

      {composing && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-3">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-accent/50"
          />
          <textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-accent/50 resize-none"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setComposing(false)} className="text-[10px] text-neutral-400 hover:text-white transition-colors">Cancel</button>
            <button
              onClick={handleSend}
              disabled={!subject.trim() || !body.trim() || isMutating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[10px] font-medium hover:bg-accent-hover transition-all disabled:opacity-40"
            >
              {isMutating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Send
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && !composing ? (
        <div className="text-center py-6">
          <MessageSquare className="h-8 w-8 text-neutral-700 mx-auto mb-2" />
          <p className="text-xs text-neutral-400">No messages with this supplier yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((msg) => {
            const isOutgoing = msg.direction === "outgoing";
            return (
              <div key={msg.id} className={`rounded-xl p-3 border ${
                isOutgoing ? "bg-accent/5 border-accent/10" : "bg-white/[0.02] border-white/[0.06]"
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white">{msg.subject}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    msg.status === "sent" ? "text-emerald-400 bg-emerald-400/10" :
                    msg.status === "read" ? "text-blue-400 bg-blue-400/10" :
                    "text-red-400 bg-red-400/10"
                  }`}>{msg.status}</span>
                </div>
                <p className="text-[11px] text-neutral-300 line-clamp-2">{msg.body}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] text-neutral-500">{isOutgoing ? "→ Sent" : "← Received"}</span>
                  <span className="text-[9px] text-neutral-500">•</span>
                  <span className="text-[9px] text-neutral-500">{new Date(msg.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AutoSwitchSection({ rules, supplierId }: { rules: AutoSwitchRule[]; supplierId: string }) {
  const { trigger: toggleRule, isMutating } = useMutation("/api/srm/auto-switch");
  const filtered = rules.filter((r) => r.supplierId === supplierId);

  const handleToggle = async (rule: AutoSwitchRule) => {
    await toggleRule({ body: { ruleId: rule.id, enabled: !rule.enabled } });
  };

  const actionConfig = {
    alert: { color: "text-amber-400", label: "Alert" },
    auto_switch: { color: "text-red-400", label: "Auto Switch" },
    notify_only: { color: "text-blue-400", label: "Notify" },
  };

  const metricLabels = {
    overall_score: "Overall Score",
    speed: "Speed",
    quality: "Quality",
    communication: "Communication",
    price: "Price",
    reliability: "Reliability",
  };

  return (
    <div className="space-y-3">
      {filtered.length === 0 ? (
        <div className="text-center py-6">
          <ArrowRightLeft className="h-8 w-8 text-neutral-700 mx-auto mb-2" />
          <p className="text-xs text-neutral-400">No auto-switch rules for this supplier.</p>
          <p className="text-[10px] text-neutral-500 mt-1">Create rules to automatically switch suppliers when metrics drop.</p>
        </div>
      ) : (
        filtered.map((rule) => {
          const action = actionConfig[rule.action];
          return (
            <div key={rule.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(rule)}
                    disabled={isMutating}
                    className="shrink-0"
                  >
                    {rule.enabled ? (
                      <ToggleRight className="h-6 w-6 text-accent" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-neutral-600" />
                    )}
                  </button>
                  <div>
                    <p className="text-xs font-medium text-white">{metricLabels[rule.metric]}</p>
                    <p className="text-[9px] text-neutral-500">
                      Trigger below {rule.threshold} → <span className={action.color}>{action.label}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-neutral-500">Triggered {rule.triggerCount}×</p>
                  {rule.lastTriggered && (
                    <p className="text-[9px] text-neutral-500">Last: {new Date(rule.lastTriggered).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              {rule.fallbackSupplierName && (
                <div className="mt-2 flex items-center gap-1.5 text-[9px] text-neutral-500">
                  <ArrowRightLeft className="h-3 w-3" />
                  Fallback: {rule.fallbackSupplierName}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

type SRMSection = "negotiations" | "messages" | "auto-switch";

export default function SupplierSRMTab({ supplierId, supplierName: _supplierName }: { supplierId: string; supplierName: string }) {
  const [activeSection, setActiveSection] = useState<SRMSection>("negotiations");
  const { ref, isInView } = useInView({ threshold: 0.05 });

  const { data: negotiationsData, isLoading: loadingNeg } = useAPI<{ negotiations?: NegotiationRecord[] }>(
    `/api/srm/negotiations?supplierId=${encodeURIComponent(supplierId)}`
  );
  const { data: messagesData, isLoading: loadingMsg } = useAPI<{ messages?: SupplierMessage[] }>(
    `/api/srm/messages?supplierId=${encodeURIComponent(supplierId)}`
  );
  const { data: rulesData, isLoading: loadingRules } = useAPI<{ rules?: AutoSwitchRule[] }>(
    "/api/srm/auto-switch"
  );

  const sections: { id: SRMSection; label: string; icon: typeof MessageSquare; count?: number }[] = [
    { id: "negotiations", label: "Negotiations", icon: GitCompare, count: negotiationsData?.negotiations?.filter((n) => n.supplierId === supplierId).length },
    { id: "messages", label: "Messages", icon: MessageSquare, count: messagesData?.messages?.filter((m) => m.supplierId === supplierId).length },
    { id: "auto-switch", label: "Auto-Switch", icon: ArrowRightLeft, count: rulesData?.rules?.filter((r) => r.supplierId === supplierId).length },
  ];

  const isLoading = loadingNeg || loadingMsg || loadingRules;

  return (
    <div ref={ref} className={`space-y-4 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      {/* Section Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium transition-all ${
              activeSection === s.id
                ? "bg-accent/15 text-accent"
                : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <s.icon className="h-3 w-3" />
            {s.label}
            {s.count !== undefined && s.count > 0 && (
              <span className="text-[8px] px-1 py-0.5 rounded-full bg-white/10">{s.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse">
              <div className="h-4 w-32 bg-white/5 rounded mb-2" />
              <div className="h-3 w-48 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {activeSection === "negotiations" && (
            <NegotiationsSection negotiations={negotiationsData?.negotiations || []} supplierId={supplierId} />
          )}
          {activeSection === "messages" && (
            <MessagesSection messages={messagesData?.messages || []} supplierId={supplierId} />
          )}
          {activeSection === "auto-switch" && (
            <AutoSwitchSection rules={rulesData?.rules || []} supplierId={supplierId} />
          )}
        </>
      )}
    </div>
  );
}
