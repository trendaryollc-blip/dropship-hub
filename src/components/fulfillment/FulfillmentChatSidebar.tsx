"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, X, Sparkles, Loader2 } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface FulfillmentChatSidebarProps {
  orderCounts: { pending: number; in_progress: number; shipped: number; completed: number };
  totalOrders: number;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatMessage(content: string): string {
  return escapeHtml(content)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/•/g, '<span class="text-accent mr-1">•</span>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/5 text-accent text-[11px] font-mono">$1</code>');
}

let msgIdCounter = 0;
function uid(): string { return `fulfillment-chat-${Date.now()}-${++msgIdCounter}`; }

export default function FulfillmentChatSidebar({ orderCounts, totalOrders }: FulfillmentChatSidebarProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const buildSystemContext = useCallback(() => {
    return `You are a fulfillment AI for DropShip Hub. The user has ${totalOrders} total orders: ${orderCounts.pending} pending, ${orderCounts.in_progress} in progress, ${orderCounts.shipped} shipped, ${orderCounts.completed} completed.\n\nHelp manage fulfillment, optimize supplier routing, track shipments, and improve profit margins.`;
  }, [orderCounts, totalOrders]);

  const quickPrompts = [
    "What orders need attention?",
    "How can I improve profit margins?",
    "Help optimize my supplier routing",
    "Show fulfillment performance insights",
  ];

  const handleSend = useCallback(async (text?: string) => {
    const content = text || input.trim();
    if (!content || isTyping) return;
    const userMsg: ChatMessage = { id: uid(), role: "user", content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    if (inputRef.current) inputRef.current.style.height = "auto";

    const systemContext = buildSystemContext();
    const apiMessages = [
      ...(systemContext ? [{ role: "system" as const, content: systemContext }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content },
    ];

    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: apiMessages, stream: true }) });
      if (!res.ok || !res.body) {
        const retry = await safeFetch<{ response?: string }>("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: apiMessages, stream: false }) });
        if (retry.response) setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: retry.response!, timestamp: new Date() }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      const msgId = uid();
      setMessages((prev) => [...prev, { id: msgId, role: "assistant", content: "", timestamp: new Date() }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n").filter(Boolean)) {
          try {
            const event = JSON.parse(line);
            if (event.type === "token") {
              full += event.content;
              setMessages((prev) => { const u = [...prev]; const l = u[u.length - 1]; if (l?.id === msgId) u[u.length - 1] = { ...l, content: full }; return u; });
            } else if (event.type === "error") { reader.cancel(); break; }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: "Sorry, something went wrong.", timestamp: new Date() }]);
    } finally { setIsTyping(false); }
  }, [input, isTyping, messages, buildSystemContext]);

  return (
    <>
      <button onClick={() => setOpen(!open)} className={`fixed bottom-6 right-6 z-30 p-4 rounded-2xl shadow-2xl transition-all ${open ? "bg-neutral-800 border border-neutral-700 text-neutral-300" : "bg-accent text-white hover:bg-accent-hover glow-accent"}`} title="AI Fulfillment Assistant">
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-30 w-[380px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-140px)] glass rounded-2xl border border-border shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10"><Sparkles className="h-4 w-4 text-accent" /></div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Fulfillment AI</h3>
                <p className="text-[10px] text-muted-foreground">{totalOrders} order{totalOrders !== 1 ? "s" : ""} tracked</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground text-center py-2">Ask anything about fulfillment</p>
                {quickPrompts.map((p) => (
                  <button key={p} onClick={() => handleSend(p)} className="w-full text-left px-3 py-2.5 rounded-xl bg-surface border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all">{p}</button>
                ))}
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-accent text-white" : "bg-surface border border-border text-foreground"}`}>
                  {msg.role === "assistant" ? <div className="prose-sm" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} /> : <span>{msg.content}</span>}
                  {msg.role === "assistant" && !msg.content && isTyping && <Loader2 className="h-4 w-4 text-accent animate-spin" />}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex items-end gap-2">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Ask about fulfillment..." rows={1} className="flex-1 resize-none px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 max-h-24" style={{ minHeight: "40px" }} />
              <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="shrink-0 p-2.5 rounded-xl bg-accent text-white disabled:opacity-40 hover:bg-accent-hover transition-all"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
