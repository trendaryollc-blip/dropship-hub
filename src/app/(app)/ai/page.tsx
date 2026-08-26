"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Brain, Send, Sparkles, TrendingUp, DollarSign,
  ShoppingCart, Truck, Target, BarChart3, Store,
  ArrowUpRight, Search, Calculator, Copy, Check,
  Package, Eye, Activity, Layers,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import SmartSuggestions from "@/components/ai/SmartSuggestions";
import LiveMarketIntel from "@/components/ai/LiveMarketIntel";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  timestamp: Date;
  actions?: { label: string; href: string; icon: React.ReactNode }[];
}

interface ContextItem {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const quickActions = [
  { label: "Find products", icon: ShoppingCart, prompt: "What are the top 5 trending dropshipping products right now with the best profit margins?", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { label: "Analyze niche", icon: Target, prompt: "Analyze the competition level and opportunity for wireless earbuds in dropshipping", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { label: "Calc margins", icon: DollarSign, prompt: "What profit margins should I target for different product categories in dropshipping?", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { label: "Find suppliers", icon: Truck, prompt: "How do I find and vet reliable suppliers for my dropshipping store?", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { label: "Ad strategy", icon: BarChart3, prompt: "What's the best Facebook Ads strategy for a new dropshipping store with a $500 budget?", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { label: "Store tips", icon: Store, prompt: "Give me 5 tips to optimize my Shopify store for maximum conversions", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
];

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content: `Hey! I'm your **DropShip Hub AI Command Center** — your dropshipping co-pilot.

I'm connected to your entire workflow and can help with:

**Product Intelligence** — Find winning products, analyze niches, predict trends
**Profit Optimization** — Calculate margins, compare supplier pricing
**Market Strategy** — Competitor analysis, ad campaigns, store tips

What would you like to explore?`,
  timestamp: new Date(),
  actions: [
    { label: "Find Products", href: "/products", icon: <Search className="h-3.5 w-3.5" /> },
    { label: "Calculate Profit", href: "/calculator", icon: <Calculator className="h-3.5 w-3.5" /> },
    { label: "My Store", href: "/store", icon: <Store className="h-3.5 w-3.5" /> },
  ],
};

const mockResponses: Record<string, { content: string; actions?: Message["actions"] }> = {
  trending: {
    content: `Here are the **top 5 winning products** right now:

**1. Pet GPS Tracker** 🏆
• Demand: 28K monthly searches
• Competition: Low (2/4)
• Supplier Cost: $8.50
• Sell Price: $29.99
• **Profit Margin: 65%**
• Trend: +340% in 30 days

**2. Posture Corrector Back Brace**
• Demand: 67K searches
• Competition: Medium
• Sell Price: $24.99
• **Profit Margin: 72%**

**3. Smart LED Strip Lights**
• Demand: 145K searches
• Sell Price: $19.99
• **Profit Margin: 58%**

**4. Portable Espresso Maker**
• Demand: 34K searches
• Competition: Low
• Sell Price: $49.99
• **Profit Margin: 45%**

**5. Smart Water Bottle**
• Demand: 22K searches
• Sell Price: $34.99
• **Profit Margin: 52%**

**My recommendation:** Start with **Pet GPS Tracker** — best competition-to-demand ratio.`,
    actions: [
      { label: "View Products", href: "/products", icon: <Search className="h-3.5 w-3.5" /> },
      { label: "Calculate Margins", href: "/calculator", icon: <Calculator className="h-3.5 w-3.5" /> },
    ],
  },
  competition: {
    content: `**Wireless Earbuds Niche Analysis**

**Market Overview**
• Monthly Search Volume: 89K
• Market Size: $2.3M monthly revenue
• Average Selling Price: $30-35
• Supplier Cost: $8.50

**Competition Level: Very High** (4/4)
• 15+ established stores
• Ad Spend Required: $500-1000/day
• Organic Ranking: Hard

**Profit Potential**
• Gross Margin: 55-65%
• Net Margin (after ads): 15-25%
• Customer Acquisition Cost: $8-15

**Strategy Recommendations**
1. **Don't compete head-on** — Too many big players
2. **Find a sub-niche** — "earbuds for athletes" or "48hr battery"
3. **Differentiate on branding** — Lifestyle brand, not just a listing
4. **Use TikTok Ads** — Lower CAC than Facebook
5. **Bundle strategy** — Extra tips, carrying case, warranty

**Verdict:** Skip generic earbuds. Target **"earbuds for athletes"** — 40% less competition.`,
    actions: [
      { label: "Competitor Analysis", href: "/competitors", icon: <Target className="h-3.5 w-3.5" /> },
      { label: "Find Products", href: "/products", icon: <Search className="h-3.5 w-3.5" /> },
    ],
  },
  margin: {
    content: `**Profit Margin Guide for Dropshipping**

**Target Margins by Category**
• Electronics: 20% min → 35% good → 50%+ excellent
• Fashion: 25% min → 40% good → 55%+ excellent
• Home & Garden: 30% min → 45% good → 60%+ excellent
• Beauty: 35% min → 50% good → 65%+ excellent
• Pet Products: 30% min → 45% good → 60%+ excellent

**The Formula**
Profit Margin = (Selling Price - Total Costs) / Selling Price × 100

**Total Costs Include:**
• Product cost (from supplier)
• Shipping ($2-8)
• Platform fees ($39/mo + 2.9%)
• Payment processing (2.9% + $0.30)
• Ad spend ($5-15 per customer)
• Returns/refunds (2-5%)

**Pro Tips**
1. Never go below 20% — You'll lose money
2. Aim for 40%+ — Room for ads and profit
3. Use the Calculator — Our tool factors ALL hidden costs
4. Price anchoring — Show original price crossed out
5. Bundle products — Increases AOV and margin`,
    actions: [
      { label: "Open Calculator", href: "/calculator", icon: <Calculator className="h-3.5 w-3.5" /> },
      { label: "Find High-Margin Products", href: "/products", icon: <DollarSign className="h-3.5 w-3.5" /> },
    ],
  },
  supplier: {
    content: `**How to Find Reliable Suppliers**

**Vetting Checklist**
✅ Response Time — Under 4 hours
✅ Order Accuracy — 95%+
✅ Shipping Speed — Under 15 days
✅ Dispute Rate — Under 1%
✅ Gold Supplier Badge — 2+ years
✅ Transaction History — 100+ orders

**Where to Find Suppliers**
1. **AliExpress** — Best for beginners
2. **CJ Dropshipping** — Faster shipping
3. **Alibaba** — Best for bulk pricing
4. **1688.com** — Cheapest (Chinese domestic)
5. **Zendrop** — US-based fulfillment

**Red Flags to Avoid** 🚩
• No reviews or few transactions
• Response time over 24 hours
• Stock photos only
• Prices too good to be true
• No return policy

**Pro Strategy**
1. Order samples from 3-5 suppliers
2. Compare quality and packaging
3. Test customer service
4. Start small, scale gradually`,
    actions: [
      { label: "Find Suppliers", href: "/suppliers", icon: <Truck className="h-3.5 w-3.5" /> },
      { label: "Supplier Intel", href: "/supplier-performance", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    ],
  },
};

function getMockResponse(input: string): { content: string; actions?: Message["actions"] } {
  const lower = input.toLowerCase();
  if (lower.includes("trending") || lower.includes("winning") || lower.includes("top 5")) return mockResponses.trending;
  if (lower.includes("compet")) return mockResponses.competition;
  if (lower.includes("margin") || lower.includes("profit")) return mockResponses.margin;
  if (lower.includes("supplier") || lower.includes("reliable")) return mockResponses.supplier;
  return {
    content: `Here's my analysis:

**Key Recommendations**

1. **Product Selection**
• Focus on products with 40%+ margins
• Target 10K-100K monthly searches
• Avoid saturated niches unless differentiated

2. **Supplier Strategy**
• Always order samples first
• Use 2-3 suppliers per product
• Negotiate after first 50 orders

3. **Marketing Approach**
• Start with TikTok Ads (lowest CAC)
• Use UGC content (3x better ROAS)
• Build email list from day one

4. **Store Optimization**
• Mobile-first design (70%+ traffic)
• One-click checkout (35% less abandonment)
• Trust badges above the fold

Want me to dive deeper into any area?`,
    actions: [
      { label: "Explore Products", href: "/products", icon: <Search className="h-3.5 w-3.5" /> },
      { label: "AI Daily Pick", href: "/dashboard", icon: <Sparkles className="h-3.5 w-3.5" /> },
    ],
  };
}

function formatMessage(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/•/g, '<span class="text-accent mr-1">•</span>')
    .replace(/✅/g, '<span class="text-emerald-400">✅</span>')
    .replace(/🚩/g, '<span class="text-red-400">🚩</span>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/5 text-accent text-[12px] font-mono">$1</code>');
}

export default function AIPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const contextItems: ContextItem[] = [
    { label: "Products Viewed", value: "12 this week", icon: <Eye className="h-3.5 w-3.5" />, color: "text-blue-400" },
    { label: "Calculations", value: "8 today", icon: <Calculator className="h-3.5 w-3.5" />, color: "text-emerald-400" },
    { label: "Connected Stores", value: user ? "1 active" : "None yet", icon: <Store className="h-3.5 w-3.5" />, color: "text-purple-400" },
    { label: "Tracked Products", value: "24 items", icon: <Package className="h-3.5 w-3.5" />, color: "text-amber-400" },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content.replace(/\*\*/g, "").replace(/•/g, "-"));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = useCallback(async (text?: string) => {
    const content = text || input.trim();
    if (!content) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const apiMessages = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();
      const response = getMockResponse(content);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.ok && data.response ? data.response : response.content,
        provider: data.provider || "AI Assistant",
        timestamp: new Date(),
        actions: response.actions,
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (data.provider) setActiveProvider(data.provider);
    } catch {
      const response = getMockResponse(content);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        provider: "AI Assistant",
        timestamp: new Date(),
        actions: response.actions,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [input, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex bg-gradient-to-b from-background to-background/95">
      {/* Left Sidebar - Fixed */}
      <aside className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-white/[0.06] bg-background/50 h-[calc(100vh-4rem)] sticky top-[4rem]">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Context Panel */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-accent" />
              <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">AI Context</span>
            </div>
            <div className="space-y-2">
              {contextItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className={item.color}>{item.icon}</span>
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-[11px] font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Suggestions */}
          <SmartSuggestions />
        </div>
      </aside>

      {/* Center - Scrollable Content */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <div className="px-8 py-4 border-b border-white/[0.06] bg-background/60 backdrop-blur-sm sticky top-[4rem] z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20">
              <Brain className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                AI Command Center
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Your dropshipping co-pilot
                {activeProvider && <span className="ml-2 text-emerald-400 font-medium">• {activeProvider}</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="px-8 pt-6 pb-4 space-y-6 max-w-4xl mx-auto">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.role === "user" ? "order-2" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10">
                      <Sparkles className="h-3 w-3 text-accent" />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      AI {msg.provider ? `• ${msg.provider}` : ""}
                    </span>
                  </div>
                )}

                <div
                  className={`p-5 rounded-2xl text-[14px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-white rounded-tr-sm"
                      : "bg-white/[0.03] border border-white/[0.06] text-foreground rounded-tl-sm"
                  }`}
                >
                  <div
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                </div>

                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.actions.map((action, i) => (
                      <Link
                        key={i}
                        href={action.href}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors border border-accent/20"
                      >
                        {action.icon}
                        {action.label}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-1.5 px-1">
                  <span className="text-[9px] text-muted-foreground/50">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => copyMessage(msg.content, msg.id)}
                      className="p-1 rounded hover:bg-white/5 transition-colors"
                      title="Copy"
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground/30 hover:text-foreground" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-tl-sm p-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Analyzing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-8 pt-4 pb-6 max-w-4xl mx-auto">
          {/* Quick Actions */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleSend(action.prompt)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium whitespace-nowrap transition-all hover:scale-[1.02] active:scale-[0.98] ${action.bg} ${action.color} ${action.border}`}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 p-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about dropshipping..."
              rows={1}
              className="flex-1 px-3 py-2.5 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm resize-none max-h-32"
              style={{ height: "auto", minHeight: "40px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="p-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Fixed */}
      <aside className="hidden xl:flex flex-col w-[300px] shrink-0 border-l border-white/[0.06] bg-background/50 h-[calc(100vh-4rem)] sticky top-[4rem]">
        <div className="flex-1 overflow-y-auto p-6">
          <LiveMarketIntel />
        </div>
      </aside>
    </div>
  );
}
