"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CheckCircle2, Loader2, Zap, Brain, AlertCircle } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";

interface Props {
  onCreated: () => void;
}

export default function AiAutosetupTab({ onCreated }: Props) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; platform?: string } | null>(null);

  const handleSetup = async () => {
    if (!prompt.trim() || !user) return;
    setProcessing(true);
    setResult(null);
    try {
      const token = await user.getIdToken();

      const aiPrompt = `You are a platform connector assistant. The user wants to connect a product data/search platform.

User request: "${prompt.trim()}"

Respond ONLY with a JSON object (no markdown, no code fences):
{
  "platformName": "Platform Display Name",
  "slug": "platform_slug",
  "method": "official_api | rainforest | serpapi | scraperapi | custom_scraper",
  "searchUrlTemplate": "https://example.com/search?q={{query}}",
  "linkPattern": "regex to find product links (capture group 1 = link)",
  "titleSelector": "regex or CSS class to find product titles (capture group 1 = title)",
  "priceSelector": "regex or CSS class to find product prices",
  "imageSelector": "regex or CSS class to find product image URLs",
  "notes": "Brief explanation of how this platform works"
}

If the platform has an official API, set method to "official_api" and set searchUrlTemplate/linkPattern/selectors to empty strings.
If it's a marketplace or supplier site, use "scraperapi" or "custom_scraper" with appropriate searchUrl and selectors.
Always include searchUrlTemplate with {{query}} placeholder for scraper-based methods.`;

      let aiText = "";
      try {
        const data = await safeFetch<{ response?: string }>("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: [{ role: "user", content: aiPrompt }] }),
        });
        aiText = typeof data.response === "string" ? data.response : "";
      } catch { /* AI unavailable */ }

      // Extract JSON from AI response
      let suggestion: Record<string, unknown> | null = null;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          suggestion = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // parse failed
      }

      if (!suggestion || !suggestion.platformName) {
        setResult({ ok: false, msg: "AI could not understand the request. Try a more specific description like 'connect Temu product search' or 'AliExpress official API'." });
        return;
      }

      const slug = String(suggestion.slug || suggestion.platformName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      const method = (["official_api", "rainforest", "serpapi", "scraperapi", "custom_scraper"].includes(String(suggestion.method))
        ? suggestion.method
        : "custom_scraper") as "official_api" | "rainforest" | "serpapi" | "scraperapi" | "custom_scraper";

      const connector = (method === "scraperapi" || method === "custom_scraper") && suggestion.searchUrlTemplate
        ? {
            searchUrlTemplate: String(suggestion.searchUrlTemplate || ""),
            linkPatternSrc: String(suggestion.linkPattern || ""),
            selectors: {
              title: String(suggestion.titleSelector || ""),
              price: String(suggestion.priceSelector || ""),
              image: String(suggestion.imageSelector || ""),
            },
            aiGenerated: true,
          }
        : undefined;

      // Create the platform
      await safeFetch("/api/platforms/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: String(suggestion.platformName),
          slug,
          method,
          enabled: false,
          connector,
        }),
      });
      const notes = suggestion.notes ? `\nNotes: ${suggestion.notes}` : "";
      setResult({
        ok: true,
        msg: `AI created "${suggestion.platformName}" (${method})! Go to the Platforms tab to add an API key and enable it.${notes}`,
        platform: String(suggestion.platformName),
      });
      setPrompt("");
      onCreated();
    } catch {
      setResult({ ok: false, msg: "AI request failed. Check your AI provider configuration." });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground mb-1">AI Autosetup</h2>
        <p className="text-sm text-muted-foreground">
          Describe the platform you want to connect in plain language. The AI will figure out the
          best search method and create the connector for you.
        </p>
      </div>

      <div className="glass rounded-xl border border-border p-6 space-y-5">
        {/* Prompt input */}
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            What do you want to connect? <span className="text-accent">*</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSetup();
              }
            }}
            rows={3}
            placeholder={'e.g. "connect Temu product search" or "I want to search AliExpress official API" or "add Walmart scraper"'}
            className="w-full mt-1 px-4 py-3 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 resize-none"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Examples: connect Temu product search · add Spocket supplier · use AliExpress official API · create a Wayfair scraper
          </p>
        </div>

        <button
          onClick={handleSetup}
          disabled={processing || !prompt.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all disabled:opacity-50"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {processing ? "AI is thinking..." : "AI: Create Connector"}
        </button>

        {result && (
          <div className={`p-4 rounded-xl border ${result.ok ? "bg-emerald-400/5 border-emerald-400/20" : "bg-red-400/5 border-red-400/20"}`}>
            <div className="flex items-start gap-2">
              {result.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              )}
              <p className={`text-sm font-medium whitespace-pre-line ${result.ok ? "text-emerald-400" : "text-red-400"}`}>
                {result.msg}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="glass rounded-xl border border-border p-4">
        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-accent" /> Tips for best results
        </h4>
        <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
          <li>Be specific: say <span className="text-foreground font-medium">&quot;connect Temu product search via ScraperAPI&quot;</span> rather than just &quot;Temu&quot;</li>
          <li>If you know the official API exists, mention it: <span className="text-foreground font-medium">&quot;use the CJ Dropshipping official API&quot;</span></li>
          <li>The AI creates a connector — you still need to add the actual API key in the Platforms tab</li>
          <li>If the AI fails, you can always use the No-Code Connector tab to build it manually</li>
        </ul>
      </div>
    </div>
  );
}
