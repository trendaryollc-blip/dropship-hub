"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, Send, X, Sparkles, Loader2, Trash2 } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import type { ConnectedStore } from "./ConnectedStoresList";
import type { PushedProduct } from "./PushedProductsList";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
function uid(): string { return `global-store-chat-${Date.now()}-${++msgIdCounter}`; }

interface GlobalStoreChatProps {
  connections: ConnectedStore[];
  pushedProducts?: PushedProduct[];
  orderCount?: number;
  totalRevenue?: number;
}

export default function GlobalStoreChat({ connections, pushedProducts = [], orderCount = 0, totalRevenue = 0 }: GlobalStoreChatProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isMultiStore = pathname.startsWith("/multi-store");

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 96)}px`;
    }
  }, [input]);

  const buildSystemContext = useCallback(() => {
    const storeList = connections.map((s) => `- ${s.name} (${s.platform}) — ${s.status}${s.productCount ? `, ${s.productCount} products` : ""}`).join("\n");

    if (isMultiStore) {
      const productSummary = pushedProducts.length > 0
        ? `\n${pushedProducts.length} products pushed: ${pushedProducts.filter((p) => p.status === "live" || p.status === "pushed").length} live, ${pushedProducts.filter((p) => p.status === "error").length} with errors.`
        : "\nNo products pushed yet.";
      return `You are a multi-store operations AI for DropShip Hub. The user manages ${connections.length} connected store(s):${storeList}${productSummary}\n\nSummary:\n- Total orders across all stores: ${orderCount}\n- Total revenue: $${totalRevenue.toLocaleString()}\n\nHelp with cross-store optimization, inventory syncing, bulk fulfillment, performance comparison, and multi-store strategy.`;
    }

    const productSummary = pushedProducts.length > 0
      ? `\n${pushedProducts.length} products pushed: ${pushedProducts.filter((p) => p.status === "live" || p.status === "pushed").length} live, ${pushedProducts.filter((p) => p.status === "error").length} with errors.`
      : "\nNo products pushed yet.";
    return `You are a store setup AI for DropShip Hub. The user has ${connections.length} connected store(s):${storeList}${productSummary}\n\nHelp with connecting stores, managing connections, pushing products, syncing inventory, and optimizing listings.`;
  }, [connections, pushedProducts, isMultiStore, orderCount, totalRevenue]);

  const quickPrompts = isMultiStore
    ? [
        "How are my stores performing overall?",
        "Which store needs the most attention?",
        "Help me sync inventory across stores",
        "Tips to optimize cross-store pricing",
      ]
    : [
        "How are my stores performing?",
        "Help me sync inventory",
        "Which store has the most products?",
        "Tips to optimize my listings",
      ];

  const handleSend = useCallback(async (text?: string) => {
    const content = text || input.trim();
    if (!content || isTyping) return;
    const userMsg: ChatMessage = { id: uid(), role: "user", content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

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

  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const chatTitle = isMultiStore ? "Multi-Store AI" : "Store AI";
  const chatSubtitle = isMultiStore
    ? `${connections.length} store${connections.length !== 1 ? "s" : ""} · $${totalRevenue.toLocaleString()} revenue`
    : `${connections.length} store${connections.length !== 1 ? "s" : ""} connected`;
  const placeholder = isMultiStore ? "Ask about your multi-store setup..." : "Ask about your stores...";
  const emptyMessage = isMultiStore ? "Ask anything about your multi-store setup" : "Ask anything about your stores";

  return (
    <>
      <button onClick={() => setOpen(!open)} className={`fixed bottom-6 right-6 z-30 p-4 rounded-2xl shadow-2xl transition-all ${open ? "bg-neutral-800 border border-neutral-700 text-neutral-300" : "bg-accent text-white hover:bg-accent-hover glow-accent"}`} title="AI Store Assistant">
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-30 w-[380px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-140px)] glass rounded-2xl border border-border shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10"><Sparkles className="h-4 w-4 text-accent" /></div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{chatTitle}</h3>
                <p className="text-[10px] text-muted-foreground">{chatSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={handleClearChat} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all" title="Clear chat">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground text-center py-2">{emptyMessage}</p>
                {quickPrompts.map((p) => (
                  <button key={p} onClick={() => handleSend(p)} className="w-full text-left px-3 py-2.5 rounded-xl bg-surface border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all">{p}</button>
                ))}
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-accent text-white" : "bg-surface border border-border text-foreground"}`}>
                  {msg.role === "assistant" ? (
                    <div className="prose-sm" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  ) : (
                    <span>{msg.content}</span>
                  )}
                  {msg.role === "assistant" && isTyping && (
                    <span className="inline-flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={placeholder}
                rows={1}
                className="flex-1 resize-none px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 max-h-24 overflow-y-auto"
                style={{ minHeight: "40px" }}
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="shrink-0 p-2.5 rounded-xl bg-accent text-white disabled:opacity-40 hover:bg-accent-hover transition-all">
                {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
