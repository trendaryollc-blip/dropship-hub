"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { type BusinessContext } from "@/app/api/ai/context/route";
import { useAIMode } from "@/contexts/AIModeContext";
import BusinessHealthRing from "@/components/ai/BusinessHealthRing";
import PromptCardGrid from "@/components/ai/PromptCardGrid";
import InsightPanel from "@/components/ai/InsightPanel";

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
import { ModeToggle } from "@/components/ai/ModeToggle";
import { ToolExecutionPanel } from "@/components/ai/ToolExecutionPanel";
import SmartSuggestions from "@/components/ai/SmartSuggestions";
import LiveMarketIntel from "@/components/ai/LiveMarketIntel";
import {
  Brain, Send, Sparkles, Copy, Check,
  ArrowUpRight, RefreshCw, ChevronDown, ChevronRight,
  Scan, PanelRightClose, PanelRightOpen,
  FileText, Plus, Keyboard, Command, Mic,
  History, MessageSquare, Share2, Edit3, RotateCcw,
  ThumbsUp, ThumbsDown, Slash, AlertTriangle,
} from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import type { ProductRecommendation, RevenueForecast, BusinessReport, CompetitorChange, CompetitorSummary } from "@/types/ai";

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
  feedback?: "up" | "down" | null;
  isStreaming?: boolean;
  isEdited?: boolean;
}

interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

interface SlashCommand {
  name: string;
  description: string;
  icon: string;
  action: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { name: "/report", description: "Generate a business report", icon: "📊", action: "generate_report" },
  { name: "/forecast", description: "Revenue forecast for next 14 days", icon: "📈", action: "generate_forecast" },
  { name: "/analyze-products", description: "Deep product performance analysis", icon: "📦", action: "analyze_products" },
  { name: "/compare-suppliers", description: "Compare supplier reliability & costs", icon: "🏭", action: "compare_suppliers" },
  { name: "/check-alerts", description: "Review critical alerts", icon: "🔔", action: "check_alerts" },
  { name: "/new", description: "Start a new conversation", icon: "✨", action: "new_session" },
  { name: "/clear", description: "Clear current chat", icon: "🗑️", action: "clear_chat" },
  { name: "/help", description: "Show available commands", icon: "❓", action: "show_help" },
];

const MAX_CONTEXT_MESSAGES = 20;

function generateSmartReplies(content: string, context: BusinessContext | null): string[] {
  const replies: string[] = [];
  const lower = content.toLowerCase();

  if (lower.includes("revenue") || lower.includes("money") || lower.includes("sales")) {
    replies.push("How does this compare to last week?");
    replies.push("Which product contributed most?");
  } else if (lower.includes("supplier")) {
    replies.push("Which supplier is the most reliable?");
    replies.push("Show me shipping times comparison");
  } else if (lower.includes("product") || lower.includes("item")) {
    replies.push("What's my best selling product?");
    replies.push("Which products should I sunset?");
  } else if (lower.includes("alert") || lower.includes("issue") || lower.includes("problem")) {
    replies.push("How do I fix this?");
    replies.push("Show me the full alert details");
  } else if (lower.includes("competitor")) {
    replies.push("How do my prices compare?");
    replies.push("What's trending in my niche?");
  } else if (context) {
    if (context.alerts.critical.length > 0) {
      replies.push("Show me the critical alerts");
    }
    if (context.revenue.trend === "down") {
      replies.push("Why is revenue declining?");
    }
    if (context.products.byStage.winning > 0) {
      replies.push("How can I scale my winning products?");
    }
  }

  if (replies.length === 0) {
    replies.push("Give me a business overview");
    replies.push("What should I focus on today?");
  }

  return replies.slice(0, 3);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMessage(content: string): string {
  return escapeHtml(content)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/•/g, '<span class="text-accent mr-1">•</span>')
    .replace(/✅/g, '<span class="text-emerald-400">✅</span>')
    .replace(/🚩/g, '<span class="text-red-400">🚩</span>')
    .replace(/❌/g, '<span class="text-red-400">❌</span>')
    .replace(/⚠️/g, '<span class="text-amber-400">⚠️</span>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/5 text-accent text-[12px] font-mono">$1</code>');
}

let messageIdCounter = 0;
function uniqueId(): string {
  return `${Date.now()}-${++messageIdCounter}`;
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

// ─── Collapsible Section Component ──────────────────────────────────────────

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <ChevronRight
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      {open && <div className="p-3 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Voice Command Indicator ────────────────────────────────────────────────

function VoiceCommandIndicator({ isListening }: { isListening: boolean }) {
  if (!isListening) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-accent/90 backdrop-blur-md rounded-2xl shadow-2xl border border-accent/30 animate-in fade-in slide-in-from-bottom-4">
      <div className="relative">
        <Mic className="h-5 w-5 text-white" />
        <div className="absolute -inset-1 bg-white/20 rounded-full animate-ping" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-white">Listening...</span>
        <span className="text-[10px] text-white/70">Speak your command</span>
      </div>
      <div className="flex gap-0.5 ml-2 items-end">
        <div className="w-1 h-3 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
        <div className="w-1 h-5 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
        <div className="w-1 h-4 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
        <div className="w-1 h-6 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

// ─── Keyboard Shortcuts Help ────────────────────────────────────────────────

function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: ["Ctrl", "K"], action: "Focus input" },
    { keys: ["Ctrl", "N"], action: "New session" },
    { keys: ["Ctrl", "B"], action: "Toggle sidebar" },
    { keys: ["Ctrl", "/"], action: "Show shortcuts" },
    { keys: ["Esc"], action: "Close modal / sidebar" },
    { keys: ["Enter"], action: "Send message" },
    { keys: ["Shift", "Enter"], action: "New line" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/5">
              <span className="text-muted-foreground text-lg">×</span>
            </button>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {shortcuts.map((s) => (
            <div key={s.action} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">{s.action}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((key) => (
                  <kbd
                    key={key}
                    className="px-2 py-0.5 text-[10px] font-mono font-medium text-foreground bg-white/[0.06] border border-white/[0.1] rounded"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State Component ──────────────────────────────────────────────────

function EmptyAIConfiguredState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 mb-5">
        <Brain className="h-8 w-8 text-accent" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">AI Not Configured</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Connect an AI provider to unlock the full power of your business brain. 
        We support Groq, Gemini, OpenAI, Mistral, DeepSeek, and more.
      </p>
      <p className="text-[11px] text-muted-foreground/50 max-w-xs mb-6">
        Once configured, you can ask about your revenue, products, suppliers, competitors, and more.
      </p>
      <a
        href="/settings"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        <span>Configure AI Providers</span>
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main Page ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function AIPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { pendingConfirmations } = useAIMode();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [context, setContext] = useState<BusinessContext | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<BusinessReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [forecast, setForecast] = useState<RevenueForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [competitorChanges, setCompetitorChanges] = useState<CompetitorChange[]>([]);
  const [competitorSummary, setCompetitorSummary] = useState<CompetitorSummary>({ totalChanges: 0, critical: 0, warnings: 0, opportunities: 0 });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [streamingStatus, setStreamingStatus] = useState<"idle" | "connecting" | "streaming" | "retrying">("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pinnedProvider, setPinnedProvider] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const handleSendRef = useRef<(text?: string) => Promise<void>>(async () => {});

  // Auth-aware fetch helper
  const fetchWithAuth = useCallback(async <T = unknown>(url: string, init?: RequestInit): Promise<T> => {
    const token = user ? await user.getIdToken() : undefined;
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return safeFetch<T>(url, { ...init, headers });
  }, [user]);

  // Raw fetch with auth headers (for streaming responses)
  const rawFetchWithAuth = useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    const token = user ? await user.getIdToken() : undefined;
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  }, [user]);

  // Fetch business context
  const fetchContext = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const data = await fetchWithAuth<BusinessContext>(`/api/ai/context?uid=${user.uid}`);
      setContext(data);
    } catch {
      // Context fetch failed — continue without it
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Check if AI is configured
  useEffect(() => {
    fetchWithAuth<{ providers: Record<string, { configured?: boolean }> }>("/api/ai")
      .then((data) => {
        const providers = data.providers || {};
        const hasConfigured = Object.values(providers).some(
          (p) => p?.configured === true
        );
        setAiConfigured(hasConfigured);
      })
      .catch(() => setAiConfigured(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K — Focus input
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Ctrl+N — New session
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setMessages([]);
        setHasStarted(false);
        setActiveProvider(null);
        setInput("");
        inputRef.current?.focus();
      }
      // Ctrl+B — Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
      // Ctrl+/ — Show shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setShowShortcuts(true);
      }
      // Escape — Close modals/sidebar
      if (e.key === "Escape") {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else if (sidebarOpen) {
          setSidebarOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [showShortcuts, sidebarOpen]);

  // Background scan on load
  useEffect(() => {
    if (!user?.uid) return;
    const runScan = async () => {
      try {
        setScanning(true);
        const data = await fetchWithAuth<ScanResult>("/api/ai/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid }),
        });
        setScanResult(data);
      } catch { /* ignore */ } finally {
        setScanning(false);
      }
    };
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Fetch recommendations, forecast, and competitor data
  useEffect(() => {
    if (!user?.uid || !hasStarted) return;
    const fetchIntelligence = async () => {
      try {
        const [recData, compData] = await Promise.allSettled([
          fetchWithAuth<{ recommendations: ProductRecommendation[] }>("/api/ai/recommendations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: user.uid }) }),
          fetchWithAuth<{ changes: CompetitorChange[]; summary: CompetitorSummary }>("/api/ai/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: user.uid }) }),
        ]);
        if (recData.status === "fulfilled") {
          setRecommendations(recData.value.recommendations || []);
        }
        if (compData.status === "fulfilled") {
          setCompetitorChanges(compData.value.changes || []);
          setCompetitorSummary(compData.value.summary || { totalChanges: 0, critical: 0, warnings: 0, opportunities: 0 });
        }
      } catch { /* ignore */ }
    };
    fetchIntelligence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, hasStarted]);

  const generateForecast = async () => {
    if (!user?.uid) return;
    setForecastLoading(true);
    try {
      const data = await fetchWithAuth<RevenueForecast>("/api/ai/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, days: 14 }),
      });
      setForecast(data);
    } catch { /* ignore */ } finally {
      setForecastLoading(false);
    }
  };

  const generateReport = async (period: "weekly" | "monthly") => {
    if (!user?.uid) return;
    setReportLoading(true);
    try {
      const data = await fetchWithAuth<BusinessReport>("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, period }),
      });
      setReport(data);
    } catch { /* ignore */ } finally {
      setReportLoading(false);
    }
  };

  const handleVoiceTranscript = useCallback((text: string) => {
    setInput((prev) => prev ? `${prev} ${text}` : text);
  }, []);

  const handleVoiceStateChange = useCallback((listening: boolean) => {
    setIsVoiceListening(listening);
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

  // ─── Conversation History ────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    fetchWithAuth<{ conversations: ConversationSummary[] }>("/api/ai/history", {
      method: "GET",
    }).then((data) => {
      if (data?.conversations) setConversations(data.conversations);
    }).catch(() => {});
  }, [user?.uid, fetchWithAuth]);

  // ─── Message Feedback ────────────────────────────────────────────
  const handleFeedback = useCallback(async (msgId: string, feedback: "up" | "down") => {
    setMessages((prev) => prev.map((m) =>
      m.id === msgId ? { ...m, feedback: m.feedback === feedback ? null : feedback } : m
    ));
    if (user?.uid) {
      fetchWithAuth("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, messageId: msgId, feedback }),
      }).catch(() => {});
    }
  }, [user?.uid, fetchWithAuth]);

  // ─── Message Editing ─────────────────────────────────────────────
  const startEditing = useCallback((msgId: string, content: string) => {
    setEditingMsgId(msgId);
    setEditingContent(content.replace(/\*\*/g, ""));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingMsgId(null);
    setEditingContent("");
  }, []);

  const submitEdit = useCallback(async () => {
    if (!editingMsgId || !editingContent.trim()) return;
    const msgIdx = messages.findIndex((m) => m.id === editingMsgId);
    if (msgIdx === -1) return;
    const newMessages = messages.slice(0, msgIdx);
    setMessages(newMessages);
    setEditingMsgId(null);
    setEditingContent("");
    await handleSendRef.current(editingContent.trim());
  }, [editingMsgId, editingContent, messages]);

  // ─── Share Message ───────────────────────────────────────────────
  const shareMessage = useCallback(async (content: string) => {
    const text = content.replace(/\*\*/g, "").replace(/•/g, "-");
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      setCopiedId("shared");
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  // ─── Slash Command Handler ───────────────────────────────────────
  const handleSlashCommand = useCallback((command: string) => {
    setShowSlashMenu(false);
    setSlashFilter("");
    const cmd = SLASH_COMMANDS.find((c) => c.name === command);
    if (!cmd) return;

    switch (cmd.action) {
      case "new_session":
        setMessages([]);
        setHasStarted(false);
        setActiveProvider(null);
        setInput("");
        break;
      case "clear_chat":
        setMessages([]);
        break;
      case "show_help":
        handleSendRef.current("What can you help me with? List all the things you can do.");
        break;
      case "generate_report":
        handleSendRef.current("Generate a weekly business report");
        break;
      case "generate_forecast":
        handleSendRef.current("Show me a 14-day revenue forecast");
        break;
      case "analyze_products":
        handleSendRef.current("Analyze my product performance and tell me which ones to focus on");
        break;
      case "compare_suppliers":
        handleSendRef.current("Compare my suppliers by reliability, shipping speed, and refund rate");
        break;
      case "check_alerts":
        handleSendRef.current("Show me all my critical alerts and what I should do about them");
        break;
    }
  }, []);

  // ─── Smart Replies Generator ─────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) {
      setSmartReplies([]);
      return;
    }
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant && !isTyping) {
      setSmartReplies(generateSmartReplies(lastAssistant.content, context));
    } else {
      setSmartReplies([]);
    }
  }, [messages, isTyping, context]);

  // ─── Context Window Truncation ───────────────────────────────────
  const truncateContext = useCallback((msgs: Message[]): Message[] => {
    if (msgs.length <= MAX_CONTEXT_MESSAGES) return msgs;
    return msgs.slice(-MAX_CONTEXT_MESSAGES);
  }, []);

  // ─── Retry Last Message ──────────────────────────────────────────
  const retryLastMessage = useCallback(async () => {
    if (messages.length === 0) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const lastUserMsg = [...messages].reverse()[lastUserIdx];
    setRetryCount((p) => p + 1);
    setStreamingStatus("retrying");
    await handleSendRef.current(lastUserMsg.content);
  }, [messages]);

  const handleSend = useCallback(async (text?: string) => {
    const content = text || input.trim();
    if (!content) return;

    // ─── Slash Command Detection ──────────────────────────────────
    if (content.startsWith("/")) {
      const cmd = SLASH_COMMANDS.find((c) => content === c.name || content.startsWith(c.name + " "));
      if (cmd) {
        setInput("");
        handleSlashCommand(cmd.name);
        return;
      }
    }

    if (!hasStarted) setHasStarted(true);

    const userMsg: Message = {
      id: uniqueId(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setStreamingStatus("connecting");
    setLastError(null);

    if (inputRef.current) inputRef.current.style.height = "auto";

    // Save user message to Firebase
    if (user?.uid) {
      fetchWithAuth<unknown>("/api/ai/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, role: "user", content }),
      }).catch((e) => { if (process.env.NODE_ENV === "development") console.warn("[AI] silently caught", e); });
    }

    try {
      // ─── Context Window Truncation ────────────────────────────────
      const truncatedMessages = truncateContext([...messages, userMsg]);
      const apiMessages = truncatedMessages
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await rawFetchWithAuth("/api/ai", {
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
        try {
          const retryData = await fetchWithAuth<{ response?: string; provider?: string }>("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: apiMessages,
              context: context || undefined,
              stream: false,
            }),
          });
          if (retryData.response) {
            const aiMsg: Message = {
              id: uniqueId(),
              role: "assistant",
              content: retryData.response,
              provider: retryData.provider || "AI",
              timestamp: new Date(),
              actions: detectActions(retryData.response) || [],
            };
            setMessages((prev) => [...prev, aiMsg]);
            if (user?.uid) {
              fetchWithAuth<unknown>("/api/ai/history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: user.uid, role: "assistant", content: retryData.response, provider: retryData.provider }),
              }).catch((e) => { if (process.env.NODE_ENV === "development") console.warn("[AI] silently caught", e); });
            }
            return;
          }
        } catch (e) { if (process.env.NODE_ENV === "development") console.warn("[AI] silently caught", e); }
        throw new Error("Failed to get response");
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let providerName = "";
      const msgId = uniqueId();

      // Add empty assistant message that we'll update as tokens stream in
      setMessages((prev) => [...prev, {
        id: msgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      }]);
      setStreamingStatus("streaming");

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

      // If stream produced no content, retry with non-streaming fallback
      if (!fullResponse) {
        try {
          const retryData = await fetchWithAuth<{ response?: string; provider?: string }>("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: apiMessages,
              context: context || undefined,
              stream: false,
            }),
          });
          if (retryData.response) {
            fullResponse = retryData.response;
            providerName = retryData.provider || "AI";
          }
        } catch (e) { if (process.env.NODE_ENV === "development") console.warn("[AI] silently caught", e); }
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
              isStreaming: false,
            };
          }
          return updated;
        });
        setStreamingStatus("idle");
        setRetryCount(0);

        // Save assistant message to Firebase
        if (user?.uid) {
          fetchWithAuth<unknown>("/api/ai/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: user.uid, role: "assistant", content: fullResponse, provider: providerName }),
          }).catch((e) => { if (process.env.NODE_ENV === "development") console.warn("[AI] silently caught", e); });
        }
      } else {
        // Stream + fallback both produced nothing — show error, remove empty bubble
        const errorMsg = aiConfigured === false
          ? "No AI provider is configured. Go to Settings > AI Providers to add your API key."
          : "I couldn't connect to the AI service. Please try again in a moment.";
        setLastError(errorMsg);
        setStreamingStatus("idle");
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== msgId);
          return [...filtered, {
            id: uniqueId(),
            role: "assistant",
            content: errorMsg,
            provider: "Error",
            timestamp: new Date(),
          }];
        });
      }
    } catch {
      const errorMsg = aiConfigured === false
        ? "No AI provider is configured. Go to Settings > AI Providers to add your API key (Groq, Gemini, OpenAI, or Mistral)."
        : "I couldn't connect to the AI service. Please try again in a moment.";
      setLastError(errorMsg);
      setStreamingStatus("idle");
      const aiMsg: Message = {
        id: uniqueId(),
        role: "assistant",
        content: errorMsg,
        provider: "Error",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
      setStreamingStatus("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, messages, hasStarted, context, user?.uid, aiConfigured, truncateContext]);

  // Keep handleSendRef in sync
  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ─── Slash Command Menu ──────────────────────────────────────
    if (input.startsWith("/")) {
      const filtered = SLASH_COMMANDS.filter((c) => c.name.includes(slashFilter));
      if (filtered.length > 0) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Tab") {
          e.preventDefault();
          return;
        }
        if (e.key === "Escape") {
          setShowSlashMenu(false);
          setSlashFilter("");
          return;
        }
      }
    }

    // ─── Edit Mode ───────────────────────────────────────────────
    if (editingMsgId) {
      if (e.key === "Escape") {
        cancelEditing();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitEdit();
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 md:-m-6">
      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Voice Command Indicator */}
      <VoiceCommandIndicator isListening={isVoiceListening} />

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
            {/* History Toggle (Suggestion 2) */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg transition-colors ${showHistory ? "bg-accent/10 text-accent" : "hover:bg-white/[0.05] text-muted-foreground"}`}
              title="Conversation history"
            >
              <History className="h-4 w-4" />
            </button>

            {/* Pending Confirmations Badge */}
            {pendingConfirmations.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <span className="text-[10px] font-bold text-orange-400">{pendingConfirmations.length} pending</span>
              </div>
            )}

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

            {/* Pinned Provider (Suggestion 14) */}
            {activeProvider && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 font-medium">{activeProvider}</span>
              </div>
            )}

            {/* Mode Toggle */}
            <div className="hidden md:block">
              <ModeToggle feature="ai_assistant" />
            </div>

            {/* Keyboard Shortcuts */}
            <button
              onClick={() => setShowShortcuts(true)}
              className="hidden md:flex p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
              title="Keyboard shortcuts (Ctrl+/)"
            >
              <Keyboard className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* New Session button */}
            <button
              onClick={() => {
                setMessages([]);
                setHasStarted(false);
                setActiveProvider(null);
                setInput("");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
              title="Start new session (Ctrl+N)"
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
              title={sidebarOpen ? "Hide sidebar (Ctrl+B)" : "Show sidebar (Ctrl+B)"}
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

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── Left Sidebar: Conversation History (Suggestion 2) ──── */}
        {showHistory && (
          <div className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/[0.08] bg-white/[0.01]">
            <div className="p-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</h3>
                <button onClick={() => setShowHistory(false)} className="p-1 rounded hover:bg-white/[0.05]">
                  <ChevronDown className="h-3 w-3 rotate-90 text-muted-foreground" />
                </button>
              </div>
              <button
                onClick={() => { setMessages([]); setHasStarted(false); setActiveProvider(null); setInput(""); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/50 text-center py-4">No conversations yet</p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversation(conv.id);
                      setHasStarted(true);
                      setShowHistory(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                      activeConversation === conv.id
                        ? "bg-accent/10 border border-accent/20"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <p className="text-xs font-medium text-foreground truncate">{conv.title}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">{conv.lastMessage}</p>
                    <p className="text-[9px] text-muted-foreground/30 mt-0.5">
                      {conv.timestamp.toLocaleDateString()} · {conv.messageCount} msgs
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Left: Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
            {/* AI Not Configured State */}
            {aiConfigured === false && !hasStarted && (
              <EmptyAIConfiguredState />
            )}

            {/* Welcome state — Prompt Cards */}
            {!hasStarted && aiConfigured !== false && (
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
                    Click any card below or type your question. The AI reads your entire business data.
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-1">
                      <Slash className="h-3 w-3" /> / for commands
                    </span>
                    <span className="flex items-center gap-1">
                      <Keyboard className="h-3 w-3" /> Ctrl+K to focus
                    </span>
                    <span className="flex items-center gap-1">
                      <Mic className="h-3 w-3" /> Voice input
                    </span>
                  </div>
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
                            {msg.isStreaming && <span className="ml-1 text-blue-400 animate-pulse">streaming...</span>}
                          </span>
                        </div>
                      )}

                      {/* ─── Edit Mode (Suggestion 5) ──────────────────────────── */}
                      {editingMsgId === msg.id ? (
                        <div className="rounded-2xl border border-accent/30 bg-white/[0.04] p-3">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="w-full bg-transparent text-foreground text-[14px] leading-relaxed resize-none focus:outline-none min-h-[80px]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                              if (e.key === "Escape") cancelEditing();
                            }}
                          />
                          <div className="flex items-center justify-end gap-2 mt-2">
                            <button onClick={cancelEditing} className="px-3 py-1 text-xs rounded-lg text-muted-foreground hover:text-foreground">Cancel</button>
                            <button onClick={submitEdit} className="px-3 py-1 text-xs rounded-lg bg-accent text-white hover:bg-accent/90">Send Edit</button>
                          </div>
                        </div>
                      ) : (
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
                      )}

                      {/* ─── Action Buttons in Messages (Suggestion 1) ──────────── */}
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

                      {/* ─── Message Action Bar (Suggestions 5, 15) ───────────── */}
                      <div className="flex items-center gap-1 mt-1.5 px-1">
                        <span className="text-[9px] text-muted-foreground/50">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {msg.isEdited && <span className="ml-1">(edited)</span>}
                        </span>
                        {msg.role === "assistant" && msg.content && (
                          <>
                            {/* Copy */}
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
                            {/* Share (Suggestion 5) */}
                            <button
                              onClick={() => shareMessage(msg.content)}
                              className="p-1 rounded hover:bg-white/5 transition-colors"
                              title="Share"
                            >
                              <Share2 className="h-3 w-3 text-muted-foreground/30 hover:text-foreground" />
                            </button>
                            {/* Regenerate (Suggestion 5) */}
                            <button
                              onClick={() => retryLastMessage()}
                              className="p-1 rounded hover:bg-white/5 transition-colors"
                              title="Regenerate"
                            >
                              <RotateCcw className="h-3 w-3 text-muted-foreground/30 hover:text-foreground" />
                            </button>
                            {/* Thumbs Up (Suggestion 15) */}
                            <button
                              onClick={() => handleFeedback(msg.id, "up")}
                              className={`p-1 rounded transition-colors ${msg.feedback === "up" ? "bg-emerald-500/10" : "hover:bg-white/5"}`}
                              title="Helpful"
                            >
                              <ThumbsUp className={`h-3 w-3 ${msg.feedback === "up" ? "text-emerald-400" : "text-muted-foreground/30 hover:text-foreground"}`} />
                            </button>
                            {/* Thumbs Down (Suggestion 15) */}
                            <button
                              onClick={() => handleFeedback(msg.id, "down")}
                              className={`p-1 rounded transition-colors ${msg.feedback === "down" ? "bg-red-500/10" : "hover:bg-white/5"}`}
                              title="Not helpful"
                            >
                              <ThumbsDown className={`h-3 w-3 ${msg.feedback === "down" ? "text-red-400" : "text-muted-foreground/30 hover:text-foreground"}`} />
                            </button>
                          </>
                        )}
                        {msg.role === "user" && !editingMsgId && (
                          <button
                            onClick={() => startEditing(msg.id, msg.content)}
                            className="p-1 rounded hover:bg-white/5 transition-colors"
                            title="Edit message"
                          >
                            <Edit3 className="h-3 w-3 text-muted-foreground/30 hover:text-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* ─── Smart Replies (Suggestion 6) ───────────────────────────── */}
                {smartReplies.length > 0 && !isTyping && (
                  <div className="flex flex-wrap gap-2 px-1">
                    {smartReplies.map((reply, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(reply)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors"
                      >
                        <Sparkles className="h-3 w-3 text-accent/60" />
                        {reply}
                      </button>
                    ))}
                  </div>
                )}

                {/* ─── Streaming & Typing Indicators (Suggestions 4, 7) ─────── */}
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
                          {streamingStatus === "connecting" && "Connecting to AI provider..."}
                          {streamingStatus === "streaming" && "Streaming response..."}
                          {streamingStatus === "retrying" && "Retrying with another provider..."}
                          {streamingStatus === "idle" && (context ? "Analyzing your business data..." : "Thinking...")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── Error Recovery UI (Suggestion 10) ─────────────────────── */}
                {lastError && !isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl rounded-tl-sm p-4 max-w-md">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-red-400 font-medium">Something went wrong</p>
                          <p className="text-xs text-muted-foreground mt-1">{lastError}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={retryLastMessage}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Try Again
                            </button>
                            <button
                              onClick={() => {
                                setLastError(null);
                                setRetryCount(0);
                              }}
                              className="px-3 py-1.5 rounded-lg text-muted-foreground text-xs hover:text-foreground"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
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
              <div className="relative">
                {/* ─── Slash Command Menu (Suggestion 13) ────────────────────── */}
                {input.startsWith("/") && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="px-3 py-2 border-b border-neutral-800">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Commands</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {SLASH_COMMANDS.filter((c) => c.name.includes(input.split(" ")[0] || "")).map((cmd) => (
                        <button
                          key={cmd.name}
                          onClick={() => { setInput(""); handleSlashCommand(cmd.name); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-800 transition-colors text-left"
                        >
                          <span className="text-base">{cmd.icon}</span>
                          <div>
                            <p className="text-sm font-medium text-white">{cmd.name}</p>
                            <p className="text-[11px] text-neutral-400">{cmd.description}</p>
                          </div>
                        </button>
                      ))}
                      {SLASH_COMMANDS.filter((c) => c.name.includes(input.split(" ")[0] || "")).length === 0 && (
                        <p className="text-center py-4 text-xs text-neutral-500">No matching commands</p>
                      )}
                    </div>
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
                    onChange={(e) => { setInput(e.target.value); setShowSlashMenu(e.target.value.startsWith("/")); }}
                    onKeyDown={handleKeyDown}
                    placeholder={context ? "Ask about your business... Type / for commands" : "Ask me anything about dropshipping... Type / for commands"}
                    rows={1}
                    className="flex-1 px-3 py-2.5 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-sm resize-none max-h-32"
                    style={{ height: "auto", minHeight: "40px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = Math.min(target.scrollHeight, 128) + "px";
                    }}
                  />
                  <VoiceInput
                    onTranscript={handleVoiceTranscript}
                    onCommand={handleSlashCommand}
                    onStateChange={handleVoiceStateChange}
                    disabled={isTyping}
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
              <div className="flex items-center justify-center gap-4 mt-2 text-[9px] text-muted-foreground/40">
                <span>Enter to send</span>
                <span>Shift+Enter for new line</span>
                <span>/ for commands</span>
                <span>Ctrl+/ for shortcuts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar — Insights & Actions */}
        {/* Mobile: slide-over overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="ml-auto w-[85vw] max-w-80 h-full bg-background border-l border-white/[0.08] overflow-y-auto animate-in slide-in-from-right duration-300">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm pb-3 border-b border-white/[0.06] z-10">
                  <h3 className="text-sm font-semibold text-foreground">Command Center</h3>
                  <div className="flex items-center gap-2">
                    <ModeToggle feature="ai_assistant" />
                    <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-white/[0.05]">
                      <ChevronDown className="h-4 w-4 rotate-90" />
                    </button>
                  </div>
                </div>

                {/* Tool Executions */}
                <CollapsibleSection title="Tool Executions" defaultOpen={pendingConfirmations.length > 0}>
                  <ToolExecutionPanel />
                </CollapsibleSection>

                {/* Priority Actions */}
                <CollapsibleSection title="Priority Actions">
                  <ActionQueue context={context} onSendPrompt={handleSend} />
                </CollapsibleSection>

                {/* Smart Alerts */}
                <SmartSuggestions />

                {/* Intelligence */}
                <CollapsibleSection title="Intelligence">
                  {recommendations.length > 0 && (
                    <RecommendationsCard recommendations={recommendations} onAskAI={handleSend} />
                  )}
                  <ForecastChart forecast={forecast} onGenerate={generateForecast} loading={forecastLoading} />
                  {competitorChanges.length > 0 && (
                    <CompetitorMonitor changes={competitorChanges} summary={competitorSummary} onAskAI={handleSend} />
                  )}
                </CollapsibleSection>

                {/* Market Intel */}
                <LiveMarketIntel />

                {/* Tools */}
                <CollapsibleSection title="Tools">
                  <div>
                    <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Ad Campaign Advisor
                    </h3>
                    <AdCampaignAdvisor uid={user?.uid || ""} />
                  </div>
                  <StoreComparator uid={user?.uid || ""} />
                  <GoalsTracker uid={user?.uid || ""} />
                  <IntegrationMonitor uid={user?.uid || ""} />
                </CollapsibleSection>

                {/* Live Insights */}
                <CollapsibleSection title="Live Insights">
                  <InsightPanel
                    context={context}
                    onNavigate={(href) => { router.push(href); }}
                  />
                </CollapsibleSection>
              </div>
            </div>
          </div>
        )}

        {/* Desktop: fixed side panel */}
        {sidebarOpen && (
          <div className="hidden md:block w-80 shrink-0 border-l border-white/[0.08] bg-white/[0.01] overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Tool Executions — show at top if pending */}
              <CollapsibleSection title="Tool Executions" defaultOpen={pendingConfirmations.length > 0}>
                <ToolExecutionPanel />
              </CollapsibleSection>

              {/* Priority Actions */}
              <CollapsibleSection title="Priority Actions">
                <ActionQueue context={context} onSendPrompt={handleSend} />
              </CollapsibleSection>

              {/* Smart Alerts */}
              <SmartSuggestions />

              {/* Intelligence */}
              <CollapsibleSection title="Intelligence">
                {recommendations.length > 0 && (
                  <RecommendationsCard recommendations={recommendations} onAskAI={handleSend} />
                )}
                <ForecastChart forecast={forecast} onGenerate={generateForecast} loading={forecastLoading} />
                {competitorChanges.length > 0 && (
                  <CompetitorMonitor changes={competitorChanges} summary={competitorSummary} onAskAI={handleSend} />
                )}
              </CollapsibleSection>

              {/* Market Intel */}
              <LiveMarketIntel />

              {/* Tools */}
              <CollapsibleSection title="Tools">
                <div>
                  <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Ad Campaign Advisor
                  </h3>
                  <AdCampaignAdvisor uid={user?.uid || ""} />
                </div>
                <StoreComparator uid={user?.uid || ""} />
                <GoalsTracker uid={user?.uid || ""} />
                <IntegrationMonitor uid={user?.uid || ""} />
              </CollapsibleSection>

              {/* Live Insights */}
              <CollapsibleSection title="Live Insights">
                <InsightPanel
                  context={context}
                  onNavigate={(href) => { router.push(href); }}
                />
              </CollapsibleSection>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
