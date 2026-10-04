"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Loader2, Search, AlertCircle } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import { getAuthHeaders } from "@/lib/auth-headers";

interface ProductImageMatch {
  title: string;
  platform: string;
  url: string;
  image: string | null;
  price: string | null;
  matchType: "exact" | "visual";
}

const PLATFORM_NAMES: Record<string, string> = {
  amazon: "Amazon",
  aliexpress: "AliExpress",
  ebay: "eBay",
  walmart: "Walmart",
  etsy: "Etsy",
  alibaba: "Alibaba",
  temu: "Temu",
  shein: "SHEIN",
  dhgate: "DHgate",
  cjdropshipping: "CJ Dropshipping",
  banggood: "Banggood",
};

export default function CrossPlatformImageMatches({
  imageUrl,
  source,
}: {
  imageUrl: string | null;
  source: string;
}) {
  const [matches, setMatches] = useState<ProductImageMatch[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchImage = async () => {
    if (!imageUrl || loading) return;
    setLoading(true);
    setError("");
    try {
      const headers = await getAuthHeaders();
      const data = await safeFetch<{ matches?: ProductImageMatch[]; error?: string }>(
        "/api/products/match-image",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ imageUrl, source }),
        }
      );
      setMatches(Array.isArray(data.matches) ? data.matches : []);
      setSearched(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="intel-card p-5 sm:p-6" aria-labelledby="image-match-title">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="icon-container-blue shrink-0">
          <Search className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 id="image-match-title" className="font-display text-sm font-semibold text-foreground">
            Find this product on other platforms
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Search marketplace listings using the product image, not just its title.
          </p>
        </div>
        <button
          type="button"
          onClick={searchImage}
          disabled={!imageUrl || loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "Searching by image" : searched ? "Search again" : "Search by image"}
        </button>
      </div>

      {!imageUrl && (
        <p className="mt-4 text-xs text-amber-400">No product image is available for reverse-image search.</p>
      )}
      {error && (
        <div role="alert" className="mt-4 flex items-center gap-2 text-xs text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {searched && !error && matches.length === 0 && (
        <p className="mt-4 text-xs text-muted-foreground">No marketplace matches were found for this image.</p>
      )}
      {matches.length > 0 && (
        <div className="mt-5 border-t border-border/50 pt-4">
          <p className="text-[10px] text-muted-foreground mb-3">
            {matches.length} image result{matches.length === 1 ? "" : "s"}. Visual similarity is evidence, not proof of an identical product.
          </p>
          <ul className="divide-y divide-border/50">
            {matches.map((match) => (
              <li key={`${match.platform}-${match.url}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                {match.image ? (
                  <Image src={match.image} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-md object-cover bg-surface shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-surface border border-border shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-semibold text-accent">
                      {PLATFORM_NAMES[match.platform] ?? match.platform}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${match.matchType === "exact" ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10" : "text-amber-400 border-amber-400/20 bg-amber-400/10"}`}>
                      {match.matchType === "exact" ? "Exact image match" : "Visual match"}
                    </span>
                  </div>
                  <p className="text-xs text-foreground truncate mt-1">{match.title}</p>
                </div>
                <span className={`text-xs font-semibold shrink-0 ${match.price ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {match.price || "Price unavailable"}
                </span>
                <a href={match.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${match.title} on ${PLATFORM_NAMES[match.platform] ?? match.platform}`} className="p-2 text-muted-foreground hover:text-accent shrink-0">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}