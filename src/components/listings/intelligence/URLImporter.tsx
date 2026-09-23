"use client";

import { useState, useCallback } from "react";
import { Link2, Loader2, Check, AlertCircle, Globe, Upload, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { authJson } from "@/lib/auth-headers";
import type { ScrapedProductData } from "@/types/listing-intelligence";

interface URLImporterProps {
  onImport: (data: ScrapedProductData) => void;
  onDismiss?: () => void;
}

const PLATFORM_ICONS: Record<string, string> = {
  aliexpress: "🔴",
  amazon: "📦",
  ebay: "🏷️",
  walmart: "🏪",
  shopify: "🛍️",
  cj: "🚚",
  temu: "💎",
  shein: "👗",
  alibaba: "🏭",
  unknown: "🌐",
};

export default function URLImporter({ onImport, onDismiss: _onDismiss }: URLImporterProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedProductData | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  const detectPlatform = useCallback((input: string) => {
    const lower = input.toLowerCase();
    if (lower.includes("aliexpress.com") || lower.includes("aliexpress.")) return "aliexpress";
    if (lower.includes("amazon.") || lower.includes("amzn.")) return "amazon";
    if (lower.includes("ebay.")) return "ebay";
    if (lower.includes("walmart.")) return "walmart";
    if (lower.includes("shopify.") || lower.includes("myshopify.com")) return "shopify";
    if (lower.includes("cjdropshipping.com")) return "cj";
    if (lower.includes("temu.com")) return "temu";
    if (lower.includes("shein.com")) return "shein";
    if (lower.includes("alibaba.com") || lower.includes("1688.com")) return "alibaba";
    return "unknown";
  }, []);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.startsWith("http")) {
      setDetectedPlatform(detectPlatform(value));
    } else {
      setDetectedPlatform(null);
    }
  };

  const handleScrape = async () => {
    if (!url.trim()) return;
    setScraping(true);
    try {
      const raw = await authJson<{ data?: ScrapedProductData; platform?: string; error?: string }>(
        "/api/ai/listings/import",
        { url: url.trim() }
      );

      const d = raw.data as ScrapedProductData | undefined;
      if (!d || (!d.title && !d.description)) {
        toastError("No product data found. Check the URL and try again.");
        return;
      }

      setScrapedData(d);
      setDetectedPlatform(raw.platform || null);
      toastSuccess("Product data imported successfully!");
    } catch (e) {
      console.error("[URLImporter] Scrape failed:", e);
      toastError("Failed to connect. Please try again.");
    } finally {
      setScraping(false);
    }
  };

  const handleApply = () => {
    if (scrapedData) {
      onImport(scrapedData);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !scraping) handleScrape();
  };

  if (scrapedData) {
    return (
      <div className="glass rounded-2xl p-4 border border-emerald-400/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <Check className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Product Imported</p>
              <p className="text-[10px] text-muted-foreground">{detectedPlatform && PLATFORM_ICONS[detectedPlatform]} {scrapedData.source}</p>
            </div>
          </div>
          <button onClick={() => { setScrapedData(null); setUrl(""); }} className="p-1 rounded-lg hover:bg-surface-hover">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-2 mb-3">
          {scrapedData.images.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {scrapedData.images.slice(0, 4).map((img, i) => (
                <img key={i} src={img} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/[0.06] shrink-0" />
              ))}
              {scrapedData.images.length > 4 && (
                <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-[9px] text-muted-foreground shrink-0">
                  +{scrapedData.images.length - 4}
                </div>
              )}
            </div>
          )}

          <div className="glass rounded-xl p-2.5 space-y-1">
            <p className="text-xs font-medium text-foreground line-clamp-2">{scrapedData.title || "Untitled product"}</p>
            {scrapedData.price > 0 && <p className="text-xs text-accent font-semibold">${scrapedData.price.toFixed(2)}</p>}
            {scrapedData.brand && <p className="text-[10px] text-muted-foreground">Brand: {scrapedData.brand}</p>}
            {scrapedData.rating > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>★ {scrapedData.rating.toFixed(1)}</span>
                <span>({scrapedData.reviewCount.toLocaleString()} reviews)</span>
              </div>
            )}
          </div>

          {Object.keys(scrapedData.specifications).length > 0 && (
            <div className="glass rounded-xl p-2.5">
              <p className="text-[10px] text-muted-foreground mb-1.5">Specifications</p>
              <div className="space-y-0.5">
                {Object.entries(scrapedData.specifications).slice(0, 5).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={handleApply} className="w-full py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-all">
          Use This Data
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Link2 className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Import from URL</p>
          <p className="text-[10px] text-muted-foreground">Paste product link from any supplier</p>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <div className="flex-1 relative">
          <input
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://aliexpress.com/item/..."
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40"
          />
          <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <button
          onClick={handleScrape}
          disabled={scraping || !url.trim()}
          className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
        >
          {scraping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {scraping ? "Scraping..." : "Import"}
        </button>
      </div>

      {detectedPlatform && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{PLATFORM_ICONS[detectedPlatform]}</span>
          <span>Detected: {detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)}</span>
        </div>
      )}

      {!detectedPlatform && url.length > 10 && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
          <AlertCircle className="h-3 w-3" />
          <span>URL format may not be fully supported</span>
        </div>
      )}
    </div>
  );
}
