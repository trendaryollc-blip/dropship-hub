"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles, Send, Loader2, Copy, Check, ExternalLink,
  BarChart3, Package, MessageSquare, TrendingUp, FileText, Shield,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { safeFetch } from "@/lib/safe-fetch";
import { auth } from "@/lib/firebase";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: typeof BarChart3;
  color: string;
  bg: string;
  prompt: () => string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "analyze",
    label: "Analyze Supplier",
    icon: BarChart3,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    prompt: () => `Give me a full analysis of this supplier based on the data you have. Evaluate their reliability, quality, pricing, shipping, and communication. Provide a final verdict: should I use them or not? What are the top 3 risks?`,
  },
  {
    id: "find-products",
    label: "Find Products",
    icon: Package,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    prompt: () => `What are the best product categories and opportunities from this supplier? Analyze their catalog, price range, MOQ, and sample availability. What should I source from them first?`,
  },
  {
    id: "negotiate",
    label: "Draft Negotiation",
    icon: MessageSquare,
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
    prompt: () => `Draft a professional negotiation message I can send to this supplier. Reference their actual MOQ, pricing, and policies. I want to discuss bulk pricing, MOQ flexibility, and exclusive deal terms.`,
  },
  {
    id: "performance",
    label: "Deep Check",
    icon: Shield,
    color: "text-pink-400",
    bg: "bg-pink-400/10 border-pink-400/20",
    prompt: () => `Run a deep performance audit on this supplier. Analyze their reliability score, dispute rate, refund policy, shipping consistency, and communication score. Flag any concerns and give me a risk assessment.`,
  },
  {
    id: "samples",
    label: "Request Samples",
    icon: FileText,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
    prompt: () => `Help me draft a sample request for this supplier. Reference their sample policy, pricing, and inspection options. What products should I request samples for based on their catalog?`,
  },
  {
    id: "compare",
    label: "Compare Pricing",
    icon: TrendingUp,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
    prompt: () => `Analyze this supplier's pricing structure. Look at their price range, MOQ, shipping costs, and free shipping threshold. Give me a cost breakdown for 100, 500, and 1000 units. Are they competitive?`,
  },
];

function renderMarkdown(text: string) {
  return text
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) return `<h3 class="text-sm font-semibold text-white mt-4 mb-2">${line.slice(4)}</h3>`;
      if (line.startsWith("## ")) return `<h2 class="text-base font-semibold text-white mt-5 mb-2">${line.slice(3)}</h2>`;
      if (line.startsWith("# ")) return `<h1 class="text-lg font-bold text-white mt-6 mb-3">${line.slice(2)}</h1>`;
      if (line.startsWith("**") && line.endsWith("**")) return `<p class="font-semibold text-white mt-3 mb-1">${line.slice(2, -2)}</p>`;
      if (line.startsWith("- ")) return `<li class="text-xs text-neutral-300 ml-4 list-disc">${line.slice(2)}</li>`;
      if (line.startsWith("• ")) return `<li class="text-xs text-neutral-300 ml-4 list-disc">${line.slice(2)}</li>`;
      if (line.trim() === "") return "<br/>";
      return `<p class="text-xs text-neutral-300 leading-relaxed">${line}</p>`;
    })
    .join("");
}

export default function SupplierAITab({ supplierId, supplierName }: { supplierId: string; supplierName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { ref, isInView } = useInView({ threshold: 0.05 });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const result = await safeFetch<{ response?: string; error?: string }>(
        "/api/ai",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content },
            ],
            supplierId,
            stream: false,
          }),
        }
      );

      if (result.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${result.error}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: result.response || "No response generated." }]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to get response";
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt());
  };

  const handleCopy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div ref={ref} className={`flex flex-col h-[600px] transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      {/* AI Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/10">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <div>
          <span className="text-xs font-semibold text-violet-400">AI Supplier Assistant</span>
          <p className="text-[9px] text-neutral-500">Contextual to {supplierName}</p>
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 ${action.bg}`}
            >
              <action.icon className={`h-3.5 w-3.5 shrink-0 ${action.color}`} />
              <span className={`text-[10px] font-medium ${action.color}`}>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-10 w-10 text-violet-500/20 mb-3" />
            <p className="text-sm text-neutral-400">Ask anything about {supplierName}</p>
            <p className="text-[10px] text-neutral-500 mt-1">Use quick actions above or type a question</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-accent/15 border border-accent/20"
                : "bg-white/[0.04] border border-white/[0.06]"
            }`}>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3 w-3 text-violet-400" />
                  <span className="text-[9px] font-medium text-violet-400">AI</span>
                </div>
              )}
              <div
                className="prose prose-invert prose-xs max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
              />
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleCopy(msg.content, i)}
                    className="flex items-center gap-1 text-[9px] text-neutral-500 hover:text-white transition-colors"
                  >
                    {copiedIdx === i ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedIdx === i ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => window.open(`/ai?q=${encodeURIComponent(msg.content)}`, "_blank")}
                    className="flex items-center gap-1 text-[9px] text-neutral-500 hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Expand
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-white/[0.04] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 text-violet-400 animate-spin" />
                <span className="text-[10px] text-neutral-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={`Ask about ${supplierName}...`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
