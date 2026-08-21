"use client";

import { useState, useRef, useEffect } from "react";
import {
  Brain, Send, Sparkles, ShoppingCart, TrendingUp,
  DollarSign, Target, AlertTriangle,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  timestamp: Date;
}

const quickPrompts = [
  { label: "Find winning products", icon: ShoppingCart, prompt: "What are the top 5 trending dropshipping products right now?" },
  { label: "Analyze competition", icon: TrendingUp, prompt: "How competitive is the wireless earbuds niche?" },
  { label: "Calculate margins", icon: DollarSign, prompt: "What's a good profit margin for dropshipping?" },
  { label: "Supplier tips", icon: Target, prompt: "How do I find reliable suppliers?" },
];

// Fallback mock responses when no AI keys are configured
const mockResponses: Record<string, string> = {
  trending: "Based on current market data, here are the top trending products:\n\n1. **Posture Corrector Back Brace** — 67K monthly searches, rising trend, medium competition\n2. **Wireless Bluetooth Earbuds** — 89K searches, high profit potential but competitive\n3. **Smart LED Strip Lights** — 145K searches, evergreen product, peaks in holidays\n4. **Portable Espresso Maker** — 34K searches, rising trend, summer peak\n5. **Pet GPS Tracker** — 28K searches, low competition, rising trend\n\nI recommend starting with the Pet GPS Tracker — it has the best competition-to-demand ratio.",
  competition:
    "The wireless earbuds niche is **highly competitive** but still profitable:\n\n• **Competition Level:** Very High (4/4)\n• **Market Size:** $89K monthly searches\n• **Average Price:** $30-35 on Amazon\n• **Supplier Cost:** $8.50 on AliExpress\n• **Profit Margin:** ~55-65%\n\n**Strategy:** Focus on a sub-niche like 'earbuds for athletes' or 'earbuds with long battery life' to differentiate.",
  margin: "For dropshipping, aim for these margins:\n\n• **Minimum:** 20% (barely viable after ad costs)\n• **Good:** 30-40% (healthy business)\n• **Excellent:** 50%+ (premium positioning)\n\n**Formula:** Profit Margin = (Selling Price - Total Costs) / Selling Price × 100\n\n**Key costs to factor in:**\n• Product cost\n• Shipping\n• Platform fees (3-15%)\n• Ad spend\n• Returns/refunds",
  supplier:
    "How to find reliable suppliers:\n\n1. **Check Trust Badges** — Gold suppliers have 95%+ reliability\n2. **Order Samples** — Always test before listing\n3. **Check Response Time** — Under 4 hours is ideal\n4. **Review Dispute Rate** — Under 1% is excellent\n5. **Verify Certifications** — CE, FCC, RoHS matter\n\nUse our **Supplier Intelligence** page to compare suppliers with AI scoring.",
};

function getMockResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("trending") || lower.includes("winning") || lower.includes("top 5")) return mockResponses.trending;
  if (lower.includes("compet")) return mockResponses.competition;
  if (lower.includes("margin") || lower.includes("profit")) return mockResponses.margin;
  if (lower.includes("supplier") || lower.includes("reliable")) return mockResponses.supplier;
  return `Great question! Based on my analysis:\n\nThe key to success in dropshipping is finding the right balance between demand, competition, and profit margins. I'd recommend:\n\n1. Use our **Product Search** to find trending items\n2. Check the **Calculator** for profit margins\n3. Find suppliers in **Supplier Intelligence**\n4. Analyze competitors in **Competitor Analysis**\n\nWould you like me to dive deeper into any of these areas?\n\n*Note: For real-time AI responses, add your free API keys in Settings → AI Providers.*`;
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hey! I'm your DropShip Hub AI assistant. I can help you with:\n\n• Finding trending products\n• Analyzing competition\n• Calculating profit margins\n• Finding reliable suppliers\n• Market timing advice\n\nWhat would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
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

    try {
      const apiMessages = [...messages, userMsg]
        .filter((m) => m.id !== "1") // remove welcome message
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();

      if (res.ok && data.response) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          provider: data.provider,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setActiveProvider(data.provider);
      } else {
        // Fallback to mock response
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: getMockResponse(content),
          provider: "Demo Mode",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch {
      // Network error — use mock
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getMockResponse(content),
        provider: "Demo Mode",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100dvh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Brain className="h-7 w-7 text-accent" /> AI Assistant
        </h1>
        <p className="text-muted-foreground">Get instant insights, recommendations, and analysis powered by AI.</p>
        {activeProvider && (
          <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Powered by {activeProvider}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto glass rounded-2xl p-4 space-y-4 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] ${msg.role === "user" ? "order-2" : ""}`}>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 rounded-md bg-accent/10">
                    <Sparkles className="h-3 w-3 text-accent" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    AI Assistant {msg.provider ? `(${msg.provider})` : ""}
                  </span>
                </div>
              )}
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-white rounded-tr-sm"
                    : "bg-surface border border-border text-foreground rounded-tl-sm"
                }`}
              >
                <div
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/•/g, '<span class="text-accent">•</span>'),
                  }}
                />
              </div>
              <p className="text-[9px] text-muted-foreground/60 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-2xl rounded-tl-sm p-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {quickPrompts.map((qp) => (
          <button
            key={qp.label}
            onClick={() => handleSend(qp.prompt)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all shrink-0"
          >
            <qp.icon className="h-3 w-3" /> {qp.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="glass rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask me anything about dropshipping..."
            className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="p-3 rounded-xl bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
