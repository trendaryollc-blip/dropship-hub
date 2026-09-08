"use client";

import { Copy, Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAPI, useMutation, revalidate } from "@/hooks/useAPI";

interface Creative {
  id: string;
  campaignId: string;
  platform: string;
  type: string;
  content: string;
  aiProvider: string;
  performance?: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    conversionRate: number;
  };
}

const typeColors: Record<string, string> = {
  headline: "text-blue-400 bg-blue-400/10",
  description: "text-emerald-400 bg-emerald-400/10",
  body: "text-purple-400 bg-purple-400/10",
  cta: "text-amber-400 bg-amber-400/10",
};

export default function CreativeLibrary({ campaignId }: { campaignId?: string }) {
  const { data, isLoading } = useAPI<{ creatives: Creative[] }>(
    campaignId ? `/api/ad-creatives?campaignId=${campaignId}` : "/api/ad-creatives"
  );
  const { trigger: deleteCreative } = useMutation("/api/ad-creatives");
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  const creatives = data?.creatives || [];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(id);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleDelete = async (id: string) => {
    await deleteCreative({ body: {}, method: "DELETE", url: `/api/ad-creatives/${id}` });
    revalidate("/api/ad-creatives");
  };

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-surface rounded w-1/3" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3">Creative Library</h3>
        <p className="text-xs text-muted-foreground text-center py-8">No creatives yet. Generate some above!</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4">Creative Library ({creatives.length})</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {creatives.map((c) => (
          <div key={c.id} className="p-3 rounded-xl bg-surface/50 border border-border group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${typeColors[c.type] || "text-gray-400 bg-gray-400/10"}`}>
                    {c.type.toUpperCase()}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{c.aiProvider}</span>
                </div>
                <p className="text-sm text-foreground break-words">{c.content}</p>
                {c.performance && (
                  <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted-foreground">
                    <span>CTR: {c.performance.ctr.toFixed(1)}%</span>
                    <span>Conv: {c.performance.conversions}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => copyToClipboard(c.content, c.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface text-muted-foreground hover:text-foreground transition-all"
                >
                  {copiedIdx === c.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
