"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2, MousePointer2, Eye, ArrowRight } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";

interface Props {
  onCreated: () => void;
}

export default function NoCodeConnectorTab({ onCreated }: Props) {
  const { user } = useAuth();
  const [platformName, setPlatformName] = useState("");
  const [searchUrl, setSearchUrl] = useState("");
  const [linkPattern, setLinkPattern] = useState("");
  const [titleSelector, setTitleSelector] = useState("");
  const [priceSelector, setPriceSelector] = useState("");
  const [imageSelector, setImageSelector] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleConnect = async () => {
    if (!platformName.trim() || !searchUrl.trim() || !user) return;
    setSaving(true);
    setResult(null);
    try {
      const token = await user.getIdToken();
      const slug = platformName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      const connector = {
        searchUrlTemplate: searchUrl.trim(),
        linkPatternSrc: linkPattern.trim() || undefined,
        selectors: {
          title: titleSelector.trim() || undefined,
          price: priceSelector.trim() || undefined,
          image: imageSelector.trim() || undefined,
        },
      };

      await safeFetch("/api/platforms/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: platformName.trim(),
          slug,
          method: "custom_scraper",
          enabled: false,
          connector,
        }),
      });
      setResult({ ok: true, msg: `${platformName.trim()} created! Go to the Platforms tab to add a ScraperAPI key and enable it.` });
      setPlatformName("");
      setSearchUrl("");
      setLinkPattern("");
      setTitleSelector("");
      setPriceSelector("");
      setImageSelector("");
      onCreated();
    } catch {
      setResult({ ok: false, msg: "Network error — try again." });
    } finally {
      setSaving(false);
    }
  };

  const hasUrl = searchUrl.includes("{{query}}");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground mb-1">No-Code Connector</h2>
        <p className="text-sm text-muted-foreground">
          Point at any product search page on the web. Enter a URL template and (optionally) field selectors
          so we know exactly where to find titles, prices, and images.
        </p>
      </div>

      <div className="glass rounded-xl border border-border p-6 space-y-5">
        {/* Platform name */}
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Platform Name</label>
          <input
            type="text"
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            placeholder="e.g. My Custom Supplier"
            className="w-full mt-1 px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          />
        </div>

        {/* URL Template */}
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Search URL Template <span className="text-accent">*</span>
          </label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Use <code className="text-accent font-mono">{"{{query}}"}</code> where the search term goes.
          </p>
          <input
            type="url"
            value={searchUrl}
            onChange={(e) => setSearchUrl(e.target.value)}
            placeholder="https://www.example.com/search?q={{query}}"
            className="w-full mt-1 px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          />
          {searchUrl && !hasUrl && (
            <p className="text-[10px] text-amber-400 mt-1">URL must contain {"{{query}}"} placeholder.</p>
          )}
        </div>

        {/* Link Pattern */}
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Product Link Regex</label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Regex to extract product links from HTML. Capture group 1 = the link.
          </p>
          <input
            type="text"
            value={linkPattern}
            onChange={(e) => setLinkPattern(e.target.value)}
            placeholder='e.g. href="(\/product\/[^"]+)"'
            className="w-full mt-1 px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          />
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <MousePointer2 className="h-3.5 w-3.5 text-accent" /> Field Selectors (optional — if left blank we use smart defaults)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Title</label>
              <input
                type="text"
                value={titleSelector}
                onChange={(e) => setTitleSelector(e.target.value)}
                placeholder='e.g. class="product-title"'
                className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Price</label>
              <input
                type="text"
                value={priceSelector}
                onChange={(e) => setPriceSelector(e.target.value)}
                placeholder='e.g. class="product-price"'
                className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Image</label>
              <input
                type="text"
                value={imageSelector}
                onChange={(e) => setImageSelector(e.target.value)}
                placeholder='e.g. class="product-image" src="(https://[^"]+)"'
                className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={saving || !platformName.trim() || !searchUrl.trim() || !hasUrl}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {saving ? "Creating..." : "Create Connector"}
        </button>

        {result && (
          <div className={`p-4 rounded-xl border ${result.ok ? "bg-emerald-400/5 border-emerald-400/20" : "bg-red-400/5 border-red-400/20"}`}>
            <p className={`text-sm font-medium ${result.ok ? "text-emerald-400" : "text-red-400"}`}>{result.msg}</p>
          </div>
        )}
      </div>

      {/* Help */}
      <div className="glass rounded-xl border border-border p-4">
        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-accent" /> How to find field selectors
        </h4>
        <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>Open the target site in your browser and search for a product.</li>
          <li>Right-click on a product title and select <span className="text-foreground font-medium">Inspect</span>.</li>
          <li>Find the <code className="text-accent font-mono">class=</code> or <code className="text-accent font-mono">data-</code> attribute on the title element.</li>
          <li>Copy that attribute value and paste it above as a <span className="text-foreground font-medium">regex pattern</span>.</li>
          <li>Example: <code className="text-accent font-mono">class=&quot;product-title&quot;&gt;([^&lt;]+)</code> — capture group 1 = the title.</li>
        </ol>
      </div>
    </div>
  );
}
