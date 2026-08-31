"use client";

import { useState } from "react";
import { Plug, CheckCircle, AlertTriangle, XCircle, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";

interface IntegrationStatus {
  id: string;
  name: string;
  type: string;
  status: "healthy" | "warning" | "error" | "disconnected";
  lastSync: string;
  issues: string[];
  healthScore: number;
}

interface IntegrationsResult {
  integrations: IntegrationStatus[];
  summary: { total: number; healthy: number; warning: number; error: number; disconnected: number };
  insights: string[];
}

export default function IntegrationMonitor({ uid }: { uid: string }) {
  const [data, setData] = useState<IntegrationsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const check = async () => {
    setLoading(true);
    try {
      setData(await safeFetch("/api/ai/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      }));
    } catch (e) { if (process.env.NODE_ENV === "development") console.warn("[IntegrationMonitor] silently caught", e); }
    setLoading(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "healthy": return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
      case "error": return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      default: return <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "store": return "🛒";
      case "ai": return "🤖";
      case "database": return "💾";
      case "email": return "📧";
      default: return "🔌";
    }
  };

  return (
    <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-[#e0e0e0]">Integration Monitor</span>
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="text-xs px-3 py-1 rounded-lg bg-[#1a1a2e] text-[#a0a0b0] hover:text-[#e0e0e0] hover:bg-[#25253a] transition-all disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check All"}
        </button>
      </div>

      {!data && !loading && (
        <p className="text-xs text-[#606070]">Monitor health of all your connected services and APIs.</p>
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[#1a1a2e] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-[#1a1a2e] rounded-lg p-1.5 text-center min-w-0">
              <p className="text-sm md:text-lg font-bold text-emerald-400">{data.summary.healthy}/{data.summary.total}</p>
              <p className="text-[9px] md:text-[10px] text-[#606070]">Healthy</p>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-1.5 text-center min-w-0">
              <p className="text-sm md:text-lg font-bold text-yellow-400">{data.summary.warning + data.summary.error}</p>
              <p className="text-[9px] md:text-[10px] text-[#606070]">Issues</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {data.integrations.map((integ) => (
              <div key={integ.id} className="bg-[#1a1a2e] rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === integ.id ? null : integ.id)}
                  className="w-full flex items-center justify-between p-2.5 text-left hover:bg-[#25253a] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {statusIcon(integ.status)}
                    <span className="text-[12px]">{typeIcon(integ.type)}</span>
                    <span className="text-xs text-[#e0e0e0] truncate">{integ.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {integ.issues.length > 0 && (
                      <span className="text-[10px] text-yellow-400">{integ.issues.length}</span>
                    )}
                    {expanded === integ.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                </button>
                {expanded === integ.id && (
                  <div className="px-2.5 pb-2.5 border-t border-[#25253a]">
                    <div className="flex items-center gap-2 mt-2">
                      <Shield className="w-3 h-3 text-[#606070]" />
                      <span className="text-[10px] text-[#606070]">Health: {integ.healthScore}/100</span>
                    </div>
                    <p className="text-[10px] text-[#606070] mt-1">Last sync: {new Date(integ.lastSync).toLocaleString()}</p>
                    {integ.issues.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {integ.issues.map((issue, i) => (
                          <p key={i} className="text-[10px] text-yellow-400">• {issue}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {data.insights.length > 0 && (
            <div className="space-y-1">
              {data.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-[#9090a0] bg-[#1a1a2e] rounded-lg p-2">
                  <Plug className="w-3 h-3 mt-0.5 shrink-0 text-purple-400" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
