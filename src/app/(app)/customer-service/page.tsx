"use client";

import { useState, useEffect, useRef } from "react";
import {
  Headphones, Send, AlertTriangle, CheckCircle2, MessageSquare,
  Shield, User, Bot, Plus,
  Copy, Trash2, Check,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useAuth } from "@/components/auth/AuthProvider";
import DemoBadge from "@/components/ui/DemoBadge";
import type { Conversation, CSMessage, CSTemplate, Escalation, CSStats } from "@/types/customer-service";

// ─── Sub-components ──────────────────────────────────────────────

function KPICard({ label, value, prefix, suffix, icon: Icon, color, delay }: {
  label: string; value: number; prefix?: string; suffix?: string; icon: typeof Headphones; color: string; delay: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useAnimatedCounter(value, 1500, isInView);
  return (
    <div ref={ref} className={`glass rounded-xl p-3 sm:p-4 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 sm:gap-3 mb-2">
        <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg ${color}/10`}>
          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color}`} />
        </div>
      </div>
      <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{prefix || ""}{count.toLocaleString()}{suffix || ""}</p>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ConversationList({ conversations, selectedId, onSelect }: { conversations: Conversation[]; selectedId: string; onSelect: (id: string) => void }) {
  const statusColors = { active: "bg-emerald-400", escalated: "bg-red-400", resolved: "bg-blue-400", waiting: "bg-amber-400" };
  const priorityColors = { low: "text-blue-400", medium: "text-amber-400", high: "text-red-400" };

  return (
    <div className="space-y-1 max-h-[600px] overflow-y-auto">
      {conversations.map((conv) => (
        <button key={conv.id} onClick={() => onSelect(conv.id)} className={`w-full text-left p-2.5 sm:p-3 rounded-xl transition-all ${selectedId === conv.id ? "bg-accent/10 border border-accent/20" : "hover:bg-surface-hover border border-transparent"}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${statusColors[conv.status]}`} />
              <span className="text-xs sm:text-sm font-medium text-foreground truncate">{conv.customerName}</span>
            </div>
            <span className={`text-[8px] sm:text-[9px] font-semibold ${priorityColors[conv.priority]}`}>{conv.priority}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate mb-1">{conv.subject}</p>
          <div className="flex items-center justify-between">
            <span className="text-[8px] sm:text-[9px] text-muted-foreground">{conv.platform}</span>
            <span className="text-[8px] sm:text-[9px] text-muted-foreground">{conv.messageCount} msgs</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function ChatThread({ messages, onSend }: { messages: CSMessage[]; onSend: (msg: string) => void }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    onSend(input);
    setInput("");
    setSending(false);
  };

  const confidenceColor = (c: number) => c >= 90 ? "text-emerald-400 bg-emerald-400/10" : c >= 75 ? "text-amber-400 bg-amber-400/10" : "text-red-400 bg-red-400/10";

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "customer" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] ${msg.role === "customer" ? "" : ""}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${msg.role === "customer" ? "" : "justify-end"}`}>
                {msg.role === "customer" ? <User className="h-3 w-3 text-muted-foreground" /> : <Bot className="h-3 w-3 text-accent" />}
                <span className="text-[9px] sm:text-[10px] text-muted-foreground capitalize">{msg.role === "ai" ? "AI Agent" : msg.role}</span>
                {msg.confidence !== undefined && (
                  <span className={`px-1 py-0.5 rounded text-[8px] font-semibold ${confidenceColor(msg.confidence)}`}>
                    {msg.confidence}% confidence
                  </span>
                )}
                {msg.escalated && (
                  <span className="px-1 py-0.5 rounded text-[8px] font-semibold text-red-400 bg-red-400/10">Escalated</span>
                )}
              </div>
              <div className={`p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${msg.role === "customer" ? "bg-surface text-foreground" : "bg-accent/10 text-foreground border border-accent/20"}`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 sm:p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Simulate customer message..." className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
          <button onClick={handleSend} disabled={sending || !input.trim()} className="p-2 rounded-xl bg-accent text-white hover:bg-accent/80 disabled:opacity-50 transition-all">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EscalationPanel({ escalations }: { escalations: Escalation[] }) {
  const reasonColors = { low_confidence: "text-amber-400 bg-amber-400/10 border-amber-400/20", frustration_detected: "text-red-400 bg-red-400/10 border-red-400/20", out_of_scope: "text-purple-400 bg-purple-400/10 border-purple-400/20", manual: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
  const statusColors = { pending: "text-amber-400", in_progress: "text-blue-400", resolved: "text-emerald-400" };
  const reasonLabels = { low_confidence: "Low Confidence", frustration_detected: "Frustration Detected", out_of_scope: "Out of Scope", manual: "Manual" };

  return (
    <div className="space-y-2">
      {escalations.map((esc) => (
        <div key={esc.id} className={`p-3 rounded-xl border ${reasonColors[esc.reason]}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs sm:text-sm font-semibold text-foreground">{esc.customerName}</span>
            <span className={`text-[9px] sm:text-[10px] font-semibold ${statusColors[esc.status]}`}>{esc.status}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1.5">{reasonLabels[esc.reason]} &middot; {esc.confidence}% confidence</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1.5 italic">&ldquo;{esc.customerMessage}&rdquo;</p>
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">{esc.reasonDetail}</p>
        </div>
      ))}
    </div>
  );
}

function TemplateManager({ templates }: { templates: CSTemplate[] }) {
  const catColors = { "order-status": "text-blue-400 bg-blue-400/10", shipping: "text-amber-400 bg-amber-400/10", returns: "text-red-400 bg-red-400/10", "product-info": "text-emerald-400 bg-emerald-400/10", general: "text-purple-400 bg-purple-400/10" };
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (body: string, id: string) => {
    navigator.clipboard.writeText(body).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-2">
      {templates.map((t) => (
        <div key={t.id} className="p-3 rounded-xl bg-surface border border-border hover:border-accent/20 transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs sm:text-sm font-medium text-foreground">{t.name}</span>
            <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-semibold ${catColors[t.category]}`}>{t.category}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-2 line-clamp-2">{t.body.slice(0, 100)}...</p>
          <div className="flex items-center justify-between">
            <span className="text-[8px] sm:text-[9px] text-muted-foreground">Used {t.usageCount} times</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => handleCopy(t.body, t.id)} className="p-1 rounded hover:bg-surface-hover transition-colors">
                {copiedId === t.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
              </button>
              <button onClick={() => {}} className="p-1 rounded hover:bg-surface-hover transition-colors"><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function CustomerServicePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CSStats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<CSMessage[]>([]);
  const [templates, setTemplates] = useState<CSTemplate[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState("conv-1");
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "escalations" | "templates">("dashboard");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const uid = user.uid;
        const [sRes, cRes, mRes, tRes, eRes] = await Promise.all([
          fetch(`/api/customer-service?uid=${uid}`),
          fetch(`/api/customer-service?type=conversations&uid=${uid}`),
          fetch(`/api/customer-service?type=messages&conversationId=conv-1&uid=${uid}`),
          fetch(`/api/customer-service?type=templates&uid=${uid}`),
          fetch(`/api/customer-service?type=escalations&uid=${uid}`),
        ]);
        const sData = await sRes.json();
        const cData = await cRes.json();
        const mData = await mRes.json();
        const tData = await tRes.json();
        const eData = await eRes.json();
        if (sData.stats) setStats(sData.stats);
        if (cData.conversations) setConversations(cData.conversations);
        if (mData.messages) setMessages(mData.messages);
        if (tData.templates) setTemplates(tData.templates);
        if (eData.escalations) setEscalations(eData.escalations);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const loadMessages = async (convId: string) => {
    setSelectedConv(convId);
    try {
      const uid = user?.uid || "";
      const res = await fetch(`/api/customer-service?type=messages&conversationId=${convId}&uid=${uid}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const handleSend = async (content: string) => {
    const userMsg: CSMessage = { id: `msg-${Date.now()}`, conversationId: selectedConv, role: "customer", content, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const uid = user?.uid || "";
      const res = await fetch("/api/customer-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, message: content, conversationId: selectedConv }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        if (data.shouldEscalate) {
          setEscalations((prev) => [...prev, {
            id: `esc-${Date.now()}`, conversationId: selectedConv, customerName: "Customer", reason: data.escalationReason || "low_confidence",
            reasonDetail: "Auto-escalated by AI", confidence: data.confidence, customerMessage: content, status: "pending", createdAt: new Date().toISOString(),
          }]);
        }
      }
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Customer Service</h1>
            <DemoBadge />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">AI-powered support with smart escalation. Handles common questions, knows when to shut up.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {escalations.filter((e) => e.status === "pending").length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-400/10 border border-red-400/20 text-[10px] sm:text-[11px] font-semibold text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {escalations.filter((e) => e.status === "pending").length} Pending
            </span>
          )}
          <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
            {(["dashboard", "chat", "escalations", "templates"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold capitalize transition-all ${activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading customer service data...</p>
        </div>
      ) : (
        <>
          {activeTab === "dashboard" && stats && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <KPICard label="Active Conversations" value={stats.activeConversations} icon={MessageSquare} color="text-emerald-400" delay={0} />
                <KPICard label="Escalation Queue" value={stats.escalatedQueue} icon={AlertTriangle} color="text-red-400" delay={100} />
                <KPICard label="Resolved Today" value={stats.resolvedToday} icon={CheckCircle2} color="text-blue-400" delay={200} />
                <KPICard label="AI Confidence" value={stats.avgConfidence} suffix="%" icon={Shield} color="text-purple-400" delay={300} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="glass rounded-2xl p-4 sm:p-5">
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-3">Performance</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between"><span className="text-[10px] sm:text-[11px] text-muted-foreground">Resolution Rate</span><span className="text-xs sm:text-sm font-bold text-emerald-400">{stats.resolutionRate}%</span></div>
                    <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${stats.resolutionRate}%` }} /></div>
                    <div className="flex items-center justify-between"><span className="text-[10px] sm:text-[11px] text-muted-foreground">AI Handled</span><span className="text-xs sm:text-sm font-bold text-accent">{stats.aiHandledPercent}%</span></div>
                    <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${stats.aiHandledPercent}%` }} /></div>
                    <div className="flex items-center justify-between"><span className="text-[10px] sm:text-[11px] text-muted-foreground">Avg Response</span><span className="text-xs sm:text-sm font-bold text-foreground">{stats.avgResponseTime}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[10px] sm:text-[11px] text-muted-foreground">Total Handled</span><span className="text-xs sm:text-sm font-bold text-foreground">{stats.totalHandled}</span></div>
                  </div>
                </div>

                <div className="lg:col-span-2 glass rounded-2xl p-4 sm:p-5">
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-3">Recent Escalations</h3>
                  <EscalationPanel escalations={escalations} />
                </div>
              </div>
            </>
          )}

          {activeTab === "chat" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="glass rounded-2xl p-3 sm:p-4">
                <h3 className="font-display text-xs sm:text-sm font-semibold text-foreground mb-3">Conversations</h3>
                <ConversationList conversations={conversations} selectedId={selectedConv} onSelect={loadMessages} />
              </div>
              <div className="lg:col-span-2 glass rounded-2xl overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-xs sm:text-sm font-semibold text-foreground">{conversations.find((c) => c.id === selectedConv)?.subject || "Select a conversation"}</h3>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">{conversations.find((c) => c.id === selectedConv)?.customerName}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-semibold ${conversations.find((c) => c.id === selectedConv)?.status === "escalated" ? "text-red-400 bg-red-400/10" : "text-emerald-400 bg-emerald-400/10"}`}>
                      {conversations.find((c) => c.id === selectedConv)?.status}
                    </span>
                  </div>
                </div>
                <ChatThread messages={messages} onSend={handleSend} />
              </div>
            </div>
          )}

          {activeTab === "escalations" && (
            <div className="max-w-3xl mx-auto">
              <EscalationPanel escalations={escalations} />
            </div>
          )}

          {activeTab === "templates" && (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Response Templates</h3>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-[10px] sm:text-[11px] font-semibold hover:bg-accent/80 transition-all">
                  <Plus className="h-3 w-3" /> New Template
                </button>
              </div>
              <TemplateManager templates={templates} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
