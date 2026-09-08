"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";
import {
  MessageSquare, TrendingUp, TrendingDown,
  Star, Send, Loader2, Plus, Trash2,
  ArrowRight, Shield, Zap,
  ArrowUpRight, ArrowDownRight, RefreshCw,
} from "lucide-react";
import type {
  SupplierMessage, NegotiationRecord, SupplierScorecard,
  AutoSwitchRule, SupplierSwitchLog,
} from "@/types/srm";

function KpiCard({ label, value, trend, icon, delay }: { label: string; value: string | number; trend?: number; icon: React.ReactNode; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const numericValue = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) || 0 : value;
  const counter = useAnimatedCounter(numericValue, 1500, isInView);
  return (
    <div ref={ref} className={`glass rounded-xl p-4 transition-all duration-500 hover:border-accent/20 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">{icon}</div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="font-display text-lg font-bold text-foreground">{typeof value === "number" ? Math.round(counter).toLocaleString() : value}</p>
    </div>
  );
}

function MessageCard({ message, delay }: { message: SupplierMessage; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const dirIcon = message.direction === "outgoing" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />;
  const typeColors: Record<string, string> = {
    inquiry: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    negotiation: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    order_issue: "bg-red-400/10 text-red-400 border-red-400/20",
    quality: "bg-purple-400/10 text-purple-400 border-purple-400/20",
    general: "bg-surface text-muted-foreground border-border",
  };
  return (
    <div ref={ref} className={`glass rounded-xl p-3 sm:p-4 transition-all duration-500 hover:border-accent/20 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold border ${typeColors[message.messageType] || typeColors.general}`}>
            {dirIcon} {message.direction}
          </span>
          <span className="text-[9px] text-muted-foreground">{message.supplierName}</span>
        </div>
        <span className="text-[9px] text-muted-foreground">{new Date(message.createdAt).toLocaleDateString()}</span>
      </div>
      <h4 className="text-xs font-semibold text-foreground mb-1">{message.subject}</h4>
      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{message.body}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
          message.status === "sent" ? "bg-emerald-400/10 text-emerald-400" :
          message.status === "read" ? "bg-blue-400/10 text-blue-400" :
          "bg-red-400/10 text-red-400"
        }`}>
          {message.status}
        </span>
        {message.cjMessageId && (
          <span className="text-[9px] text-muted-foreground">CJ ID: {message.cjMessageId}</span>
        )}
      </div>
    </div>
  );
}

function NegotiationCard({ negotiation, delay, onAddRound, onConclude }: {
  negotiation: NegotiationRecord;
  delay: number;
  onAddRound: (negotiationId: string, price: number, message: string) => void;
  onConclude: (negotiationId: string, status: string, finalPrice?: number) => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const [expanded, setExpanded] = useState(false);
  const [roundPrice, setRoundPrice] = useState("");
  const [roundMessage, setRoundMessage] = useState("");
  const [addingRound, setAddingRound] = useState(false);

  const statusColors: Record<string, string> = {
    active: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    accepted: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    rejected: "bg-red-400/10 text-red-400 border-red-400/20",
    expired: "bg-gray-400/10 text-gray-400 border-gray-400/20",
    counter_offered: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  };

  const handleAddRound = async () => {
    if (!roundPrice || !roundMessage) return;
    setAddingRound(true);
    await onAddRound(negotiation.id, parseFloat(roundPrice), roundMessage);
    setRoundPrice("");
    setRoundMessage("");
    setAddingRound(false);
  };

  const progress = negotiation.targetPrice > 0
    ? Math.min(100, ((negotiation.initialPrice - negotiation.currentOffer) / (negotiation.initialPrice - negotiation.targetPrice)) * 100)
    : 0;

  return (
    <div ref={ref} className={`glass rounded-xl transition-all duration-500 hover:border-accent/20 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="p-3 sm:p-4 cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <h4 className="text-xs font-semibold text-foreground">{negotiation.productTitle}</h4>
            <p className="text-[9px] text-muted-foreground">{negotiation.supplierName}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${statusColors[negotiation.status] || statusColors.active}`}>
            {negotiation.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <div><span className="text-muted-foreground">Initial:</span> <span className="font-semibold text-foreground">${negotiation.initialPrice}</span></div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <div><span className="text-muted-foreground">Current:</span> <span className="font-semibold text-accent">${negotiation.currentOffer}</span></div>
          <div><span className="text-muted-foreground">Target:</span> <span className="font-semibold text-foreground">${negotiation.targetPrice}</span></div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-surface overflow-hidden">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
          <div className="space-y-1.5">
            {negotiation.rounds.map((round) => (
              <div key={round.roundNumber} className={`flex items-start gap-2 p-2 rounded-lg text-[10px] ${round.initiator === "us" ? "bg-accent/5 ml-4" : "bg-surface/50 mr-4"}`}>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${round.initiator === "us" ? "bg-accent/20 text-accent" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                  {round.initiator === "us" ? "You" : "Supplier"}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">${round.price} — {round.message}</p>
                  <p className="text-[9px] text-muted-foreground">{new Date(round.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          {negotiation.status === "active" && (
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Price"
                value={roundPrice}
                onChange={(e) => setRoundPrice(e.target.value)}
                className="w-24 px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50"
              />
              <input
                type="text"
                placeholder="Message"
                value={roundMessage}
                onChange={(e) => setRoundMessage(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50"
              />
              <button
                onClick={handleAddRound}
                disabled={!roundPrice || !roundMessage || addingRound}
                className="px-3 py-1.5 rounded-lg bg-accent text-white text-[10px] font-semibold hover:bg-accent/90 disabled:opacity-50"
              >
                {addingRound ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </button>
            </div>
          )}
          {negotiation.status === "active" && (
            <div className="flex gap-2">
              <button
                onClick={() => onConclude(negotiation.id, "accepted", negotiation.currentOffer)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-400/20"
              >
                Accept Current
              </button>
              <button
                onClick={() => onConclude(negotiation.id, "rejected")}
                className="flex-1 px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-[10px] font-semibold hover:bg-red-400/20"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScorecardCard({ scorecard, delay }: { scorecard: SupplierScorecard; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const [expanded, setExpanded] = useState(false);
  const gradeColors: Record<string, string> = {
    "A+": "text-emerald-400 bg-emerald-400/10", "A": "text-emerald-400 bg-emerald-400/10", "A-": "text-emerald-400 bg-emerald-400/10",
    "B+": "text-blue-400 bg-blue-400/10", "B": "text-blue-400 bg-blue-400/10", "B-": "text-blue-400 bg-blue-400/10",
    "C+": "text-amber-400 bg-amber-400/10", "C": "text-amber-400 bg-amber-400/10", "C-": "text-amber-400 bg-amber-400/10",
    "D": "text-red-400 bg-red-400/10", "F": "text-red-400 bg-red-400/10",
  };
  const trendIcons: Record<string, React.ReactNode> = {
    improving: <TrendingUp className="h-3 w-3 text-emerald-400" />,
    stable: <ArrowRight className="h-3 w-3 text-muted-foreground" />,
    declining: <TrendingDown className="h-3 w-3 text-red-400" />,
  };
  const criteria = [
    { key: "speed", label: "Speed", ...scorecard.criteria.speed },
    { key: "quality", label: "Quality", ...scorecard.criteria.quality },
    { key: "communication", label: "Communication", ...scorecard.criteria.communication },
    { key: "price", label: "Price", ...scorecard.criteria.price },
    { key: "reliability", label: "Reliability", ...scorecard.criteria.reliability },
  ];

  return (
    <div ref={ref} className={`glass rounded-xl transition-all duration-500 hover:border-accent/20 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="p-3 sm:p-4 cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-xs font-semibold text-foreground">{scorecard.supplierName}</h4>
            <p className="text-[9px] text-muted-foreground">Last evaluated: {new Date(scorecard.lastEvaluated).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            {trendIcons[scorecard.trend]}
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${gradeColors[scorecard.grade] || "text-muted-foreground bg-muted-foreground/10"}`}>
              {scorecard.grade}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="font-display text-xl font-bold text-foreground">{scorecard.overallScore.toFixed(1)}</p>
            <p className="text-[9px] text-muted-foreground">Overall</p>
          </div>
          <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${scorecard.overallScore}%` }} />
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2">
          {criteria.map((c) => (
            <div key={c.key} className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">{c.label} ({(c.weight * 100).toFixed(0)}%)</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${c.score}%` }} />
                </div>
                <span className="font-semibold text-foreground w-8 text-right">{c.score}</span>
              </div>
            </div>
          ))}
          {scorecard.history.length > 1 && (
            <div className="mt-3">
              <p className="text-[9px] text-muted-foreground mb-1">Score History</p>
              <div className="flex items-end gap-0.5 h-8">
                {scorecard.history.slice(0, 14).reverse().map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-accent/30" style={{ height: `${(h.overallScore / 100) * 100}%` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AutoSwitchPanel({ rules, scorecards, onAddRule, onDeleteRule }: {
  rules: AutoSwitchRule[];
  scorecards: SupplierScorecard[];
  onAddRule: (rule: Omit<AutoSwitchRule, "id">) => void;
  onDeleteRule: (ruleId: string) => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [threshold, setThreshold] = useState("70");
  const [metric, setMetric] = useState<AutoSwitchRule["metric"]>("overall_score");
  const [action, setAction] = useState<AutoSwitchRule["action"]>("alert");

  const handleAdd = () => {
    if (!supplierId) return;
    const sc = scorecards.find((s) => s.supplierId === supplierId);
    onAddRule({
      supplierId,
      supplierName: sc?.supplierName || supplierId,
      enabled: true,
      threshold: parseFloat(threshold) || 70,
      metric,
      action,
      triggerCount: 0,
      createdAt: new Date().toISOString(),
    });
    setSupplierId("");
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-accent" /> Auto-Switch Rules
      </h3>
      <div className="space-y-2 mb-4">
        {rules.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-2">No rules configured.</p>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
              <div className="text-[10px]">
                <span className="font-semibold text-foreground">{rule.supplierName}</span>
                <span className="text-muted-foreground"> — if {rule.metric} {"<"} {rule.threshold} → {rule.action}</span>
              </div>
              <button onClick={() => onDeleteRule(rule.id)} className="p-1 rounded hover:bg-red-400/10 text-muted-foreground hover:text-red-400">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="space-y-2">
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50">
          <option value="">Select supplier</option>
          {scorecards.map((s) => <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <select value={metric} onChange={(e) => setMetric(e.target.value as AutoSwitchRule["metric"])} className="px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50">
            <option value="overall_score">Overall</option>
            <option value="speed">Speed</option>
            <option value="quality">Quality</option>
            <option value="communication">Communication</option>
            <option value="price">Price</option>
            <option value="reliability">Reliability</option>
          </select>
          <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50" placeholder="Threshold" />
          <select value={action} onChange={(e) => setAction(e.target.value as AutoSwitchRule["action"])} className="px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50">
            <option value="alert">Alert</option>
            <option value="auto_switch">Auto Switch</option>
            <option value="notify_only">Notify Only</option>
          </select>
        </div>
        <button onClick={handleAdd} disabled={!supplierId} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent text-white text-[10px] font-semibold hover:bg-accent/90 disabled:opacity-50">
          <Plus className="h-3 w-3" /> Add Rule
        </button>
      </div>
    </div>
  );
}

function ComposeMessageModal({ onClose, onSend, loading }: { onClose: () => void; onSend: (data: { supplierId: string; subject: string; body: string; messageType: string }) => void; loading: boolean }) {
  const [supplierId, setSupplierId] = useState("cj-dropshipping");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [messageType, setMessageType] = useState("general");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl p-5 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-foreground">Compose Message</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
        </div>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/50">
          <option value="cj-dropshipping">CJ Dropshipping</option>
          <option value="aliexpress-standard">AliExpress</option>
        </select>
        <select value={messageType} onChange={(e) => setMessageType(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/50">
          <option value="general">General</option>
          <option value="inquiry">Inquiry</option>
          <option value="negotiation">Negotiation</option>
          <option value="order_issue">Order Issue</option>
          <option value="quality">Quality</option>
        </select>
        <input type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50" />
        <textarea placeholder="Message body..." value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 resize-none" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={() => onSend({ supplierId, subject, body, messageType })}
            disabled={!subject || !body || loading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SRMPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const { error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<"messages" | "negotiations" | "scorecards" | "auto-switch">("scorecards");
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: msgData, mutate: refetchMessages } = useAPI<{ messages?: SupplierMessage[] }>(uid ? `/api/srm/messages?uid=${uid}` : null);
  const { data: negData, mutate: refetchNegotiations } = useAPI<{ negotiations?: NegotiationRecord[] }>(uid ? `/api/srm/negotiations?uid=${uid}` : null);
  const { data: scData } = useAPI<{ scorecards?: SupplierScorecard[] }>(uid ? `/api/srm/scorecards?uid=${uid}` : null);
  const { data: ruleData, mutate: refetchRules } = useAPI<{ rules?: AutoSwitchRule[] }>(uid ? `/api/srm/auto-switch?uid=${uid}` : null);
  const { data: switchData } = useAPI<{ logs?: SupplierSwitchLog[] }>(uid ? `/api/srm/auto-switch?type=logs&uid=${uid}` : null);

  const messages = msgData?.messages || [];
  const negotiations = negData?.negotiations || [];
  const scorecards = scData?.scorecards || [];
  const rules = ruleData?.rules || [];
  const switchLogs = switchData?.logs || [];
  const loading = !user || (!msgData && !scData);

  const unreadMessages = messages.filter((m) => m.status !== "read" && m.direction === "incoming").length;
  const activeNegotiations = negotiations.filter((n) => n.status === "active").length;
  const avgScore = scorecards.length > 0 ? scorecards.reduce((s, c) => s + c.overallScore, 0) / scorecards.length : 0;

  const handleSendMessage = async (data: { supplierId: string; subject: string; body: string; messageType: string }) => {
    setSending(true);
    try {
      await safeFetch("/api/srm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      refetchMessages();
      setShowCompose(false);
    } catch { toastError("Failed to send message"); }
    setSending(false);
  };

  const handleAddNegotiationRound = async (negotiationId: string, price: number, message: string) => {
    try {
      await safeFetch("/api/srm/negotiations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_round", negotiationId, round: { price, message, initiator: "us" } }),
      });
      refetchNegotiations();
    } catch { toastError("Failed to add negotiation round"); }
  };

  const handleConcludeNegotiation = async (negotiationId: string, status: string, finalPrice?: number) => {
    try {
      await safeFetch("/api/srm/negotiations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "conclude", negotiationId, status, finalPrice }),
      });
      refetchNegotiations();
    } catch { toastError("Failed to conclude negotiation"); }
  };

  const handleAddAutoSwitchRule = async (rule: Omit<AutoSwitchRule, "id">) => {
    try {
      await safeFetch("/api/srm/auto-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      refetchRules();
    } catch { toastError("Failed to add auto-switch rule"); }
  };

  const handleDeleteAutoSwitchRule = async (ruleId: string) => {
    try {
      await safeFetch(`/api/srm/auto-switch?ruleId=${ruleId}`, { method: "DELETE" });
      refetchRules();
    } catch { toastError("Failed to delete auto-switch rule"); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
            <Shield className="h-7 w-7 text-accent" /> Supplier Relationship Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Manage supplier communications, track negotiations, evaluate performance with weighted scorecards, and auto-switch when performance drops.
          </p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all"
        >
          <Send className="h-3.5 w-3.5" /> Compose Message
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Supplier Score" value={avgScore.toFixed(1)} icon={<Star className="h-4 w-4 text-amber-400" />} delay={0} />
        <KpiCard label="Active Negotiations" value={activeNegotiations} icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} delay={100} />
        <KpiCard label="Unread Messages" value={unreadMessages} icon={<MessageSquare className="h-4 w-4 text-blue-400" />} delay={200} />
        <KpiCard label="Auto-Switch Rules" value={rules.length} icon={<Zap className="h-4 w-4 text-purple-400" />} delay={300} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border overflow-x-auto">
        {[
          { id: "scorecards" as const, label: "Scorecards", icon: <Star className="h-3.5 w-3.5" /> },
          { id: "messages" as const, label: "Messages", icon: <MessageSquare className="h-3.5 w-3.5" /> },
          { id: "negotiations" as const, label: "Negotiations", icon: <TrendingUp className="h-3.5 w-3.5" /> },
          { id: "auto-switch" as const, label: "Auto-Switch", icon: <Zap className="h-3.5 w-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Scorecards ═══ */}
      {activeTab === "scorecards" && (
        <div className="space-y-4">
          {scorecards.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No scorecards yet</p>
              <p className="text-xs text-muted-foreground">Create scorecards to evaluate supplier performance with weighted criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {scorecards.map((sc, i) => (
                <ScorecardCard key={sc.supplierId} scorecard={sc} delay={i * 100} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Tab: Messages ═══ */}
      {activeTab === "messages" && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No messages yet</p>
              <p className="text-xs text-muted-foreground">Send messages to suppliers via CJ API or log communications manually.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageCard key={msg.id} message={msg} delay={i * 50} />
            ))
          )}
        </div>
      )}

      {/* ═══ Tab: Negotiations ═══ */}
      {activeTab === "negotiations" && (
        <div className="space-y-3">
          {negotiations.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No negotiations yet</p>
              <p className="text-xs text-muted-foreground">Track price negotiations and reach agreements with suppliers.</p>
            </div>
          ) : (
            negotiations.map((neg, i) => (
              <NegotiationCard
                key={neg.id}
                negotiation={neg}
                delay={i * 80}
                onAddRound={handleAddNegotiationRound}
                onConclude={handleConcludeNegotiation}
              />
            ))
          )}
        </div>
      )}

      {/* ═══ Tab: Auto-Switch ═══ */}
      {activeTab === "auto-switch" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AutoSwitchPanel
            rules={rules}
            scorecards={scorecards}
            onAddRule={handleAddAutoSwitchRule}
            onDeleteRule={handleDeleteAutoSwitchRule}
          />
          <div className="glass rounded-2xl p-4 sm:p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-accent" /> Switch History
            </h3>
            {switchLogs.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-4">No supplier switches recorded.</p>
            ) : (
              <div className="space-y-2">
                {switchLogs.map((log) => (
                  <div key={log.id} className="p-2 rounded-lg bg-surface/50 text-[10px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{log.fromSupplierName}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-semibold text-accent">{log.toSupplierName}</span>
                    </div>
                    <p className="text-muted-foreground">{log.reason}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">{new Date(log.switchedAt).toLocaleString()} · {log.triggerType}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <ComposeMessageModal
          onClose={() => setShowCompose(false)}
          onSend={handleSendMessage}
          loading={sending}
        />
      )}
    </div>
  );
}
