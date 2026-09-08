"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { useMutation } from "@/hooks/useAPI";

interface CreativeGeneratorProps {
  campaignId?: string;
  onGenerated?: () => void;
}

export default function CreativeGenerator({ campaignId, onGenerated }: CreativeGeneratorProps) {
  const { trigger: generate, isMutating } = useMutation("/api/ad-creatives/generate");
  const [form, setForm] = useState({
    platform: "facebook" as "facebook" | "google",
    productTitle: "",
    productDescription: "",
    targetAudience: "",
    tone: "professional" as "professional" | "casual" | "urgent" | "playful" | "luxury",
    types: ["headline", "description"] as string[],
    count: 3,
  });
  const [results, setResults] = useState<Array<{ type: string; content: string }>>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await generate({
      body: { ...form, campaignId },
    }) as { creatives?: Array<{ type: string; content: string }> };
    if (result?.creatives) {
      setResults(result.creatives);
      onGenerated?.();
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const toggleType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      types: prev.types.includes(type) ? prev.types.filter((t) => t !== type) : [...prev.types, type],
    }));
  };

  const inputClass = "w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm focus:outline-none focus:border-accent/50 transition-all";

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-400" /> AI Creative Generator
      </h3>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Platform</label>
            <select
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value as typeof form.platform })}
              className={inputClass}
            >
              <option value="facebook">Facebook</option>
              <option value="google">Google</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tone</label>
            <select
              value={form.tone}
              onChange={(e) => setForm({ ...form, tone: e.target.value as typeof form.tone })}
              className={inputClass}
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="urgent">Urgent</option>
              <option value="playful">Playful</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Product Title *</label>
          <input
            type="text"
            value={form.productTitle}
            onChange={(e) => setForm({ ...form, productTitle: e.target.value })}
            placeholder="e.g., Wireless Noise-Cancelling Earbuds"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Product Description</label>
          <textarea
            value={form.productDescription}
            onChange={(e) => setForm({ ...form, productDescription: e.target.value })}
            placeholder="Brief description of the product and its key benefits..."
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target Audience</label>
          <input
            type="text"
            value={form.targetAudience}
            onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
            placeholder="e.g., 18-35 tech enthusiasts"
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Creative Types</label>
          <div className="flex flex-wrap gap-2">
            {["headline", "description", "body", "cta"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  form.types.includes(type)
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "bg-surface text-muted-foreground border border-border hover:border-accent/20"
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Variants per Type</label>
          <input
            type="range"
            min="1"
            max="10"
            value={form.count}
            onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
            className="w-full accent-accent"
          />
          <p className="text-xs text-muted-foreground text-center mt-1">{form.count} variants</p>
        </div>

        <button
          type="submit"
          disabled={isMutating || !form.productTitle || form.types.length === 0}
          className="w-full px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-sm font-medium text-accent hover:bg-accent/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isMutating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Generate Creatives</>
          )}
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-5 space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground mb-3">Generated Creatives</h4>
          {results.map((r, i) => (
            <div key={i} className="p-3 rounded-xl bg-surface/50 border border-border group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-medium text-accent uppercase">{r.type}</span>
                  <p className="text-sm text-foreground mt-1 break-words">{r.content}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(r.content, i)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface text-muted-foreground hover:text-foreground transition-all shrink-0"
                >
                  {copiedIdx === i ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
