"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { type BusinessContext } from "@/app/api/ai/context/route";
import BusinessHealthRing from "@/components/ai/BusinessHealthRing";
import PromptCardGrid from "@/components/ai/PromptCardGrid";
import InsightPanel from "@/components/ai/InsightPanel";
import CrossPageStatus from "@/components/ai/CrossPageStatus";
import ActionQueue from "@/components/ai/ActionQueue";
import VoiceInput from "@/components/ai/VoiceInput";
import ReportViewer from "@/components/ai/ReportViewer";
import RecommendationsCard from "@/components/ai/RecommendationsCard";
import ForecastChart from "@/components/ai/ForecastChart";
import CompetitorMonitor from "@/components/ai/CompetitorMonitor";
import AdCampaignAdvisor from "@/components/ai/AdCampaignAdvisor";
import StoreComparator from "@/components/ai/StoreComparator";
import GoalsTracker from "@/components/ai/GoalsTracker";
import IntegrationMonitor from "@/components/ai/IntegrationMonitor";
import {
  Brain, Send, Sparkles, Copy, Check,
  ArrowUpRight, RefreshCw, ChevronDown, ChevronUp,
  Trash2, Scan, PanelRightClose, PanelRightOpen,
  FileText, Zap, Plus,
} from "lucide-react";

interface ScanResult {
  hasChanges: boolean;
  criticalCount: number;
  newOpportunities: string[];
  urgentActions: string[];
  scanTimestamp: string;
  summary: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  timestamp: Date;
  actions?: { label: string; href: string }[];
}

function formatMessage(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/•/g, '<span class="text-accent mr-1">•</span>')
    .replace(/✅/g, '<span class="text-emerald-400">✅</span>')
    .replace(/🚩/g, '<span class="text-red-400">🚩</span>')
    .replace(/❌/g, '<span class="text-red-400">❌</span>')
    .replace(/⚠️/g, '<span class="text-amber-400">⚠️</span>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/5 text-accent text-[12px] font-mono">$1</code>');
}

function detectActions(content: string): Message["actions"] {
  const actions: Message["actions"] = [];
  const pageMap: Record<string, { label: string; href: string }> = {
    "/dashboard": { label: "View Dashboard", href: "/dashboard" },
    "/products": { label: "Browse Products", href: "/products" },
    "/suppliers": { label: "Find Suppliers", href: "/suppliers" },
    "/supplier-performance": { label: "Supplier Intel", href: "/supplier-performance" },
    "/calculator": { label: "Open Calculator", href: "/calculator" },
    "/profit-tracker": { label: "Profit Tracker", href: "/profit-tracker" },
    "/revenue": { label: "View Revenue", href: "/revenue" },
    "/customer-service": { label: "Customer Service", href: "/customer-service" },
    "/store": { label: "Manage Store", href: "/store" },
    "/competitors": { label: "Competitor Analysis", href: "/competitors" },
    "/order-router": { label: "Order Router", href: "/order-router" },
    "/product-lifecycle": { label: "Product Lifecycle", href: "/product-lifecycle" },
    "/missions": { label: "Daily Missions", href: "/missions" },
    "/digest": { label: "Daily Digest", href: "/digest" },
  };

  for (const [path, action] of Object.entries(pageMap)) {
    if (content.includes(path)) {
      actions.push(action);
    }
  }
  return actions.slice(0, 3);
}

export default function AIPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [context, setContext] = useState<BusinessContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; severity: string; read: boolean }[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [competitorChanges, setCompetitorChanges] = useState<any[]>([]);
  const [competitorSummary, setCompetitorSummary] = useState({ totalChanges: 0, critical: 0, warnings: 0, opportunities: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch business context
  const fetchContext = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setContextLoading(true);
      const res = await fetch(`/api/ai/context?uid=${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setContext(data);
      }
    } catch {
      // Context fetch failed — continue without it
    } finally {
      setContextLoading(false);
    }
  }, [user?.uid]);

  // Check if AI is configured
  useEffect(() => {
    fetch("/api/ai")
      .then((res) => res.json())
      .then((data) => {
        const providers = data.providers || {};
        const hasConfigured = Object.values(providers).some(
          (p: unknown) => (p as { configured?: boolean })?.configured === true
        );
        setAiConfigured(hasConfigured);
      })
      .catch(() => setAiConfigured(false));
  }, []);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  // Auto-refresh context every 2 minutes
  useEffect(() => {
    if (!user?.uid) return;
    const interval = setInterval(fetchContext, 120000);
    return () => clearInterval(interval);
  }, [user?.uid, fetchContext]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-scroll on context load
  useEffect(() => {
    if (context && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [context]);

  // Background scan on load
  useEffect(() => {
    if (!user?.uid) return;
    const runScan = async () => {
      try {
        setScanning(true);
        const res = await fetch("/api/ai/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid }),
        });
        if (res.ok) {
          const data = await res.json();
          setScanResult(data);
        }
      } catch { /* ignore */ } finally {
        setScanning(false);
      }
    };
    runScan();
  }, [user?.uid]);

  const clearHistory = async () => {
    if (!user?.uid) return;
    try {
      await fetch(`/api/ai/history?uid=${user.uid}`, { method: "DELETE" });
      setMessages([]);
      setHasStarted(false);
    } catch { /* ignore */ }
  };

  // Fetch notifications
  useEffect(() => {
    if (!user?.uid) return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/ai/notifications?uid=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch { /* ignore */ }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [user?.uid]);

  // Fetch recommendations, forecast, and competitor data
  useEffect(() => {
    if (!user?.uid || !hasStarted) return;
    const fetchIntelligence = async () => {
      try {
        const [recRes, compRes] = await Promise.allSettled([
          fetch("/api/ai/recommendations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: user.uid }) }),
          fetch("/api/ai/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: user.uid }) }),
        ]);
        if (recRes.status === "fulfilled" && recRes.value.ok) {
          const data = await recRes.value.json();
          setRecommendations(data.recommendations || []);
        }
        if (compRes.status === "fulfilled" && compRes.value.ok) {
          const data = await compRes.value.json();
          setCompetitorChanges(data.changes || []);
          setCompetitorSummary(data.summary || { totalChanges: 0, critical: 0, warnings: 0, opportunities: 0 });
        }
      } catch { /* ignore */ }
    };
    fetchIntelligence();
  }, [user?.uid, hasStarted]);

  const generateForecast = async () => {
    if (!user?.uid) return;
    setForecastLoading(true);
    try {
      const res = await fetch("/api/ai/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, days: 14 }),
      });
      if (res.ok) {
        const data = await res.json();
        setForecast(data);
      }
    } catch { /* ignore */ } finally {
      setForecastLoading(false);
    }
  };

  const generateReport = async (period: "weekly" | "monthly") => {
    if (!user?.uid) return;
    setReportLoading(true);
    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, period }),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch { /* ignore */ } finally {
      setReportLoading(false);
    }
  };

  const handleVoiceTranscript = useCallback((text: string) => {
    setInput((prev) => prev ? `${prev} ${text}` : text);
  }, []);

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content.replace(/\*\*/g, "").replace(/•/g, "-"));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefreshContext = async () => {
    setRefreshing(true);
    await fetchContext();
    setRefreshing(false);
  };

  // Don't auto-load history — start fresh each visit
  // History is saved for AI context but not displayed on load

  const handleSend = useCallback(async (text?: string) => {
    const content = text || input.trim();
    if (!content) return;

    if (!hasStarted) setHasStarted(true);

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

    // Save user message to Firebase
    if (user?.uid) {
      fetch("/api/ai/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, role: "user", content }),
      }).catch(() => {});
    }

    try {
      const apiMessages = [...messages, userMsg]
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          context: context || undefined,
          stream: true,
        }),
      });

      if (!res.ok || !res.body) {
        // Non-streaming fallback — try again without stream
        const retryRes = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            context: context || undefined,
            stream: false,
          }),
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          if (retryData.response) {
            const aiMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: retryData.response,
              provider: retryData.provider || "AI",
              timestamp: new Date(),
              actions: detectActions(retryData.response) || [],
            };
            setMessages((prev) => [...prev, aiMsg]);
            if (user?.uid) {
              fetch("/api/ai/history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: user.uid, role: "assistant", content: retryData.response, provider: retryData.provider }),
              }).catch(() => {});
            }
            return;
          }
        }
        throw new Error("Failed to get response");
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let providerName = "";
      const msgId = (Date.now() + 1).toString();

      // Add empty assistant message that we'll update as tokens stream in
      setMessages((prev) => [...prev, {
        id: msgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.type === "provider") {
              providerName = event.name;
              setActiveProvider(event.name);
            } else if (event.type === "token") {
              fullResponse += event.content;
              // Update the last message (assistant) with accumulated content
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.id === msgId) {
                  updated[updated.length - 1] = {
                    ...lastMsg,
                    content: fullResponse,
                    provider: providerName,
                  };
                }
                return updated;
              });
            } else if (event.type === "error") {
              // Stream failed — retry with non-streaming fallback
              const errMsg = event.message || "Stream error occurred";
              fullResponse = "";
              // Signal to retry below
              providerName = "Error";
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.id === msgId) {
                  updated[updated.length - 1] = { ...lastMsg, content: "Retrying with another AI provider...", provider: "Fallback" };
                }
                return updated;
              });
              // Break out of stream reading — will retry below
              reader.cancel();
              break;
            }
          } catch { /* skip malformed */ }
        }
      }

      // If stream failed, retry with non-streaming fallback
      if (!fullResponse && providerName === "Error") {
        const retryRes = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            context: context || undefined,
            stream: false,
          }),
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          if (retryData.response) {
            fullResponse = retryData.response;
            providerName = retryData.provider || "AI";
          }
        }
      }

      // Finalize: add actions to the streamed message
      if (fullResponse) {
        const detectedActions = detectActions(fullResponse) || [];
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.id === msgId) {
            updated[updated.length - 1] = {
              ...lastMsg,
              content: fullResponse,
              provider: providerName,
              actions: detectedActions.length > 0 ? detectedActions : undefined,
            };
          }
          return updated;
        });

        // Save assistant message to Firebase
        if (user?.uid) {
          fetch("/api/ai/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: user.uid, role: "assistant", content: fullResponse, provider: providerName }),
          }).catch(() => {});
        }
      }
    } catch {
      const errorMsg = aiConfigured === false
        ? "No AI provider is configured. Go to Settings > AI Providers to add your API key (Groq, Gemini, OpenAI, or Mistral)."
        : "I couldn't connect to the AI service. Please try again in a moment.";
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorMsg,
        provider: "Error",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [input, messages, hasStarted, context, user?.uid]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 md:-m-6">
      {/* Header */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b border-white/[0.08] bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
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
                Your business brain — reads every page, connects every dot
                {activeProvider && <span className="ml-2 text-emerald-400 font-medium">via {activeProvider}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Scan indicator */}
            {scanResult?.hasChanges && !scanning && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Scan className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-medium text-amber-400">{scanResult.criticalCount} issues</span>
              </div>
            )}
            {scanning && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <Scan className="h-3 w-3 text-muted-foreground animate-pulse" />
                <span className="text-[10px] text-muted-foreground">Scanning...</span>
              </div>
            )}
            {/* Health Ring */}
            {context && (
              <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <BusinessHealthRing score={context.healthScore.overall} size={40} strokeWidth={3} showLabel={false} />
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">{context.healthScore.overall}/100</p>
                  <p className="text-[9px] text-muted-foreground">Health</p>
                </div>
              </div>
            )}
            {/* New Session button */}
            <button
              onClick={() => {
                setMessages([]);
                setHasStarted(false);
                setActiveProvider(null);
                setInput("");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
              title="Start new session"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Session</span>
            </button>
            <button
              onClick={handleRefreshContext}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-50"
              title="Refresh business data"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? (
                <PanelRightClose className="h-4 w-4 text-muted-foreground" />
              ) : (
                <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Cross-page status strip — full-width scrollable */}
      <div className="shrink-0 border-b border-white/[0.06] bg-white/[0.01] relative">
        <div
          className="overflow-x-auto status-scroll"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.15) transparent",
          }}
        >
          <CrossPageStatus context={context} />
        </div>
        {/* Right fade to indicate scrollability */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
            {/* Welcome state — Prompt Cards */}
            {!hasStarted && (
              <div className="px-4 md:px-6 py-6 space-y-6">
                {/* Hero section */}
                <div className="text-center mb-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 mx-auto mb-4">
                    <Sparkles className="h-7 w-7 text-accent" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                    What do you need to know?
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Click any card below — the AI will read your entire business data and give you specific, actionable answers.
                  </p>
                </div>

                {/* Health Ring + Quick Summary */}
                {context && (
                  <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <BusinessHealthRing score={context.healthScore.overall} size={80} strokeWidth={6} />
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">${context.revenue.today}</p>
                        <p className="text-[10px] text-muted-foreground">Revenue Today</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{context.products.totalTracked}</p>
                        <p className="text-[10px] text-muted-foreground">Products</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{context.suppliers.totalActive}</p>
                        <p className="text-[10px] text-muted-foreground">Suppliers</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-bold ${context.alerts.critical.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
                          {context.alerts.critical.length + context.customerService.escalatedQueue}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Critical Issues</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prompt Cards */}
                <PromptCardGrid
                  context={context}
                  onSendPrompt={handleSend}
                  loading={isTyping}
                />
              </div>
            )}

            {/* Chat messages */}
            {hasStarted && (
              <div className="px-4 md:px-6 pt-6 pb-4 space-y-6 max-w-3xl mx-auto">
                {/* Navigation bar */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setHasStarted(false)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className="h-3 w-3 rotate-90" />
                    Back to command cards
                  </button>
                  <button
                    onClick={() => {
                      setMessages([]);
                      setHasStarted(false);
                      setActiveProvider(null);
                    }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    New Session
                  </button>
                </div>

                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] md:max-w-[80%] ${msg.role === "user" ? "order-2" : ""}`}>
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10">
                            <Sparkles className="h-3 w-3 text-accent" />
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            AI {msg.provider ? `via ${msg.provider}` : ""}
                          </span>
                        </div>
                      )}

                      <div
                        className={`p-5 rounded-2xl text-[14px] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-accent text-white rounded-tr-sm"
                            : "bg-white/[0.04] border border-white/[0.08] text-foreground rounded-tl-sm"
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
                            <a
                              key={i}
                              href={action.href}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors border border-accent/20"
                            >
                              {action.label}
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
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
                    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-tl-sm p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {context ? "Analyzing your business data..." : "Thinking..."}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Sticky input area */}
          <div className="shrink-0 border-t border-white/[0.08] bg-background/80 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto px-4 md:px-6 pt-3 pb-4">
              {/* Report viewer (expandable above input) */}
              {showReport && (
                <div className="mb-3">
                  <ReportViewer report={report} onGenerate={generateReport} loading={reportLoading} />
                </div>
              )}
              <div className="flex items-end gap-2 p-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl">
                <button
                  onClick={() => setShowReport(!showReport)}
                  className={`p-2.5 rounded-xl transition-all shrink-0 ${
                    showReport
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.1]"
                  }`}
                  title={showReport ? "Hide report" : "Show business report"}
                >
                  <FileText className="h-4 w-4" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={context ? "Ask about your business..." : "Ask me anything about dropshipping..."}
                  rows={1}
                  className="flex-1 px-3 py-2.5 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm resize-none max-h-32"
                  style={{ height: "auto", minHeight: "40px" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 128) + "px";
                  }}
                />
                <VoiceInput onTranscript={handleVoiceTranscript} disabled={isTyping} />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="p-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar — Insights & Actions */}
        {/* Mobile: slide-over overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="ml-auto w-[85vw] max-w-80 h-full bg-background border-l border-white/[0.08] overflow-y-auto animate-in slide-in-from-right">
              <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Command Center</h3>
                  <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-white/[0.05]">
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </button>
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Priority Actions
                  </h3>
                  <ActionQueue context={context} onSendPrompt={handleSend} />
                </div>
                {recommendations.length > 0 && (
                  <RecommendationsCard recommendations={recommendations} onAskAI={handleSend} />
                )}
                <ForecastChart forecast={forecast} onGenerate={generateForecast} loading={forecastLoading} />
                {competitorChanges.length > 0 && (
                  <CompetitorMonitor changes={competitorChanges} summary={competitorSummary} onAskAI={handleSend} />
                )}
                <div>
                  <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Ad Campaign Advisor
                  </h3>
                  <AdCampaignAdvisor uid={user?.uid || ""} />
                </div>
                <StoreComparator uid={user?.uid || ""} />
                <GoalsTracker uid={user?.uid || ""} />
                <IntegrationMonitor uid={user?.uid || ""} />
                <div>
                  <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Live Insights
                  </h3>
                  <InsightPanel
                    context={context}
                    onNavigate={(href) => { window.location.href = href; }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop: fixed side panel */}
        {sidebarOpen && (
          <div className="hidden md:block w-80 shrink-0 border-l border-white/[0.08] bg-white/[0.01] overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Action Queue */}
              <div>
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Priority Actions
                </h3>
                <ActionQueue context={context} onSendPrompt={handleSend} />
              </div>

              {/* Product Recommendations */}
              {recommendations.length > 0 && (
                <RecommendationsCard recommendations={recommendations} onAskAI={handleSend} />
              )}

              {/* Revenue Forecast */}
              <ForecastChart forecast={forecast} onGenerate={generateForecast} loading={forecastLoading} />

              {/* Competitor Monitor */}
              {competitorChanges.length > 0 && (
                <CompetitorMonitor changes={competitorChanges} summary={competitorSummary} onAskAI={handleSend} />
              )}

              {/* Ad Campaign Advisor */}
              <div>
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Ad Campaign Advisor
                </h3>
                <AdCampaignAdvisor uid={user?.uid || ""} />
              </div>

              {/* Store Comparator */}
              <StoreComparator uid={user?.uid || ""} />

              {/* Goals Tracker */}
              <GoalsTracker uid={user?.uid || ""} />

              {/* Integration Monitor */}
              <IntegrationMonitor uid={user?.uid || ""} />

              {/* Live Insights */}
              <div>
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Live Insights
                </h3>
                <InsightPanel
                  context={context}
                  onNavigate={(href) => { window.location.href = href; }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
