"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Copy, Check, ExternalLink, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import { auth } from "@/lib/firebase";

interface QuickActionResultProps {
  actionId: string;
  actionLabel: string;
  prompt: string;
  onClose: () => void;
}

const ACTION_STYLES: Record<string, {
  icon: string;
  gradient: string;
  border: string;
  glow: string;
  headerBg: string;
  badge: string;
}> = {
  analyze: {
    icon: "text-blue-400",
    gradient: "from-blue-500/10 via-blue-400/5 to-transparent",
    border: "border-blue-400/25",
    glow: "shadow-[0_0_30px_rgba(96,165,250,0.08)]",
    headerBg: "bg-gradient-to-r from-blue-500/10 to-blue-400/5",
    badge: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  },
  "find-products": {
    icon: "text-emerald-400",
    gradient: "from-emerald-500/10 via-emerald-400/5 to-transparent",
    border: "border-emerald-400/25",
    glow: "shadow-[0_0_30px_rgba(52,211,153,0.08)]",
    headerBg: "bg-gradient-to-r from-emerald-500/10 to-emerald-400/5",
    badge: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  },
  negotiate: {
    icon: "text-violet-400",
    gradient: "from-violet-500/10 via-violet-400/5 to-transparent",
    border: "border-violet-400/25",
    glow: "shadow-[0_0_30px_rgba(167,139,250,0.08)]",
    headerBg: "bg-gradient-to-r from-violet-500/10 to-violet-400/5",
    badge: "bg-violet-400/10 text-violet-400 border-violet-400/20",
  },
  "compare-pricing": {
    icon: "text-amber-400",
    gradient: "from-amber-500/10 via-amber-400/5 to-transparent",
    border: "border-amber-400/25",
    glow: "shadow-[0_0_30px_rgba(251,191,36,0.08)]",
    headerBg: "bg-gradient-to-r from-amber-500/10 to-amber-400/5",
    badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  },
  "request-samples": {
    icon: "text-cyan-400",
    gradient: "from-cyan-500/10 via-cyan-400/5 to-transparent",
    border: "border-cyan-400/25",
    glow: "shadow-[0_0_30px_rgba(34,211,238,0.08)]",
    headerBg: "bg-gradient-to-r from-cyan-500/10 to-cyan-400/5",
    badge: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
  },
  "check-performance": {
    icon: "text-pink-400",
    gradient: "from-pink-500/10 via-pink-400/5 to-transparent",
    border: "border-pink-400/25",
    glow: "shadow-[0_0_30px_rgba(244,114,182,0.08)]",
    headerBg: "bg-gradient-to-r from-pink-500/10 to-pink-400/5",
    badge: "bg-pink-400/10 text-pink-400 border-pink-400/20",
  },
};

export default function QuickActionResult({ actionId, actionLabel, prompt, onClose }: QuickActionResultProps) {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);
  const style = ACTION_STYLES[actionId] || ACTION_STYLES.analyze;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchResponse = async () => {
      setIsLoading(true);
      setError(null);
      setResponse("");

      try {
        const messages = [
          { role: "user" as const, content: prompt },
        ];

        const token = await auth.currentUser?.getIdToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const result = await safeFetch<{ response?: string; error?: string }>(
          "/api/ai",
          {
            method: "POST",
            headers,
            body: JSON.stringify({ messages, stream: false }),
            signal: controller.signal,
          }
        );

        if (!cancelled) {
          if (result.error) {
            setError(result.error);
          } else {
            setResponse(result.response || "No response generated.");
          }
        }
      } catch (err: any) {
        if (!cancelled && err.name !== "AbortError") {
          setError(err.message || "Failed to get AI response");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchResponse();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [prompt]);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    let inTable = false;
    let tableHtml = "";
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isTableRow = line.startsWith("|") && line.endsWith("|");
      const isSeparator = /^\|[\s\-|]+\|$/.test(line);

      if (isTableRow && !isSeparator) {
        if (!inTable) {
          inTable = true;
          tableHtml = '<div class="my-4 overflow-x-auto rounded-xl border border-border/50"><table class="w-full text-xs"><thead>';
          const cells = line.split("|").filter((c) => c.trim());
          tableHtml += "<tr>" + cells.map((c) => `<th class="px-3 py-2.5 text-left font-semibold text-foreground bg-surface/50 border-b border-border/50">${c.trim()}</th>`).join("") + "</tr></thead><tbody>";
        } else {
          const cells = line.split("|").filter((c) => c.trim());
          const rowIdx = result.length;
          tableHtml += `<tr class="${rowIdx % 2 === 0 ? "bg-transparent" : "bg-surface/30"} hover:bg-surface/50 transition-colors">` +
            cells.map((c) => {
              let content = c.trim();
              content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
              return `<td class="px-3 py-2 text-muted-foreground border-b border-border/30">${content}</td>`;
            }).join("") + "</tr>";
        }
        continue;
      }

      if (inTable) {
        inTable = false;
        tableHtml += "</tbody></table></div>";
        result.push(tableHtml);
        tableHtml = "";
      }

      if (isSeparator) continue;

      if (line.startsWith("### ")) {
        result.push(`<h3 class="text-sm font-bold text-foreground mt-5 mb-2.5 flex items-center gap-2"><span class="w-1 h-4 rounded-full bg-accent inline-block"></span>${line.slice(4)}</h3>`);
      } else if (line.startsWith("## ")) {
        result.push(`<h2 class="text-base font-bold text-foreground mt-6 mb-3 pb-2 border-b border-border/50">${line.slice(3)}</h2>`);
      } else if (line.startsWith("# ")) {
        result.push(`<h1 class="text-lg font-black text-foreground mt-7 mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">${line.slice(2)}</h1>`);
      } else if (line.startsWith("**") && line.endsWith("**")) {
        result.push(`<p class="font-bold text-foreground mt-3 mb-1 text-sm">${line.slice(2, -2)}</p>`);
      } else if (line.startsWith("- ") || line.startsWith("• ")) {
        const item = line.startsWith("- ") ? line.slice(2) : line.slice(2);
        let content = item;
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
        result.push(`<div class="flex items-start gap-2 my-1 ml-1"><span class="w-1.5 h-1.5 rounded-full bg-accent/60 mt-1.5 shrink-0"></span><span class="text-sm text-muted-foreground leading-relaxed">${content}</span></div>`);
      } else if (line.startsWith("> ")) {
        result.push(`<div class="my-3 px-4 py-3 rounded-xl bg-accent/5 border-l-2 border-accent/40 text-sm text-muted-foreground italic">${line.slice(2)}</div>`);
      } else if (line.trim() === "") {
        result.push("<div class='h-2'></div>");
      } else {
        let content = line;
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
        content = content.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-surface text-accent text-[11px] font-mono">$1</code>');
        result.push(`<p class="text-sm text-muted-foreground leading-relaxed">${content}</p>`);
      }
    }

    if (inTable) {
      tableHtml += "</tbody></table></div>";
      result.push(tableHtml);
    }

    return result.join("");
  };

  return (
    <div className={`glass rounded-2xl border ${style.border} ${style.glow} overflow-hidden animate-slide-up`}>
      {/* Header */}
      <div className={`relative ${style.headerBg} border-b border-border/50`}>
        <div className="absolute inset-0 bg-gradient-to-r ${style.gradient} opacity-50" />
        <div className="relative flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${style.badge} border`}>
              <Sparkles className={`h-4 w-4 ${style.icon}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{actionLabel}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">AI-powered analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {response && !isLoading && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-surface/80 border border-border/50 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface/80 border border-border/50 transition-all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div ref={responseRef} className="p-5 max-h-96 overflow-y-auto scrollbar-thin">
        {isLoading && (
          <div className="py-10 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-xl ${style.badge} border flex items-center justify-center`}>
                  <Sparkles className={`h-5 w-5 ${style.icon} animate-pulse`} />
                </div>
                <div className="absolute inset-0 rounded-xl animate-ping opacity-20">
                  <div className={`w-10 h-10 rounded-xl ${style.badge} border`} />
                </div>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Analyzing suppliers...</p>
              <p className="text-[10px] text-muted-foreground">This may take a moment</p>
            </div>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-accent/40"
                  style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Something went wrong</p>
              <p className="text-xs text-red-400 max-w-xs mx-auto">{error}</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface border border-border transition-all"
              >
                Dismiss
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          </div>
        )}

        {response && !isLoading && (
          <div className="animate-fade-in">
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(response) }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      {response && !isLoading && (
        <div className="relative border-t border-border/50">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="px-4 py-3 flex items-center justify-between bg-surface/20">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] text-muted-foreground">AI-generated analysis based on supplier data</p>
            </div>
            <button
              onClick={() => window.open(`/ai?q=${encodeURIComponent(prompt)}`, "_blank")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-accent hover:text-accent/80 hover:bg-accent/5 border border-accent/20 transition-all"
            >
              <ExternalLink className="h-3 w-3" />
              Open in AI Assistant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
