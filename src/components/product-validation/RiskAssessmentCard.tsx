"use client";

import { AlertOctagon, Scale, FileWarning } from "lucide-react";
import type { RiskAssessmentResult } from "@/types/product-validation";

const overallConfig = {
  minimal: { color: "text-emerald-400", bg: "bg-emerald-400/10", gradient: "from-emerald-400 to-emerald-500", label: "Minimal Risk" },
  low: { color: "text-emerald-400", bg: "bg-emerald-400/10", gradient: "from-emerald-400 to-emerald-500", label: "Low Risk" },
  moderate: { color: "text-amber-400", bg: "bg-amber-400/10", gradient: "from-amber-400 to-amber-500", label: "Moderate Risk" },
  high: { color: "text-orange-400", bg: "bg-orange-400/10", gradient: "from-orange-400 to-orange-500", label: "High Risk" },
  critical: { color: "text-red-400", bg: "bg-red-400/10", gradient: "from-red-400 to-red-500", label: "Critical Risk" },
};

const severityConfig = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-red-400",
};

const statusConfig = {
  compliant: { color: "text-emerald-400", bg: "bg-emerald-400/5", border: "border-emerald-400/15" },
  warning: { color: "text-amber-400", bg: "bg-amber-400/5", border: "border-amber-400/15" },
  violation: { color: "text-red-400", bg: "bg-red-400/5", border: "border-red-400/15" },
};

export default function RiskAssessmentCard({ data }: { data: RiskAssessmentResult }) {
  const overall = overallConfig[data.overallRisk];
  const circumference = 2 * Math.PI * 35;
  const dashoffset = circumference - (data.score / 100) * circumference;

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${overall.gradient} opacity-[0.03] pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${overall.bg} flex items-center justify-center border border-current/20`}>
            <AlertOctagon className={`h-5 w-5 ${overall.color}`} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Risk Assessment</h3>
            <p className="text-[11px] text-muted-foreground">Legal & compliance risks</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${overall.color} ${overall.bg} border-current/20`}>
          {overall.label}
        </span>
      </div>

      {/* Score Circle */}
      <div className="flex items-center gap-6 mb-5 relative">
        <div className="relative w-28 h-28 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="5" className="text-surface" />
            <circle cx="40" cy="40" r="35" fill="none" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashoffset}
              className={overall.color} style={{ stroke: "currentColor", transition: "stroke-dashoffset 1s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-display font-black ${overall.color}`}>{data.score}</span>
            <span className="text-[8px] text-muted-foreground">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {data.insuranceRecommendation.needed && (
            <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
              <p className="text-[10px] text-amber-400 font-semibold mb-1">Insurance Recommended</p>
              <p className="text-[10px] text-muted-foreground">{data.insuranceRecommendation.reason}</p>
            </div>
          )}
          <div className="p-3 rounded-xl bg-surface/40 border border-border/30">
            <p className="text-[10px] text-muted-foreground mb-1 font-medium">Total Risk Score</p>
            <p className={`text-lg font-display font-bold ${data.totalRiskScore <= 30 ? "text-emerald-400" : data.totalRiskScore <= 60 ? "text-amber-400" : "text-red-400"}`}>
              {data.totalRiskScore}/100
            </p>
          </div>
        </div>
      </div>

      {/* Legal Risks */}
      {data.legalRisks.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Legal Risks</p>
          <div className="space-y-2">
            {data.legalRisks.map((risk, i) => (
              <div key={i} className="p-3 rounded-xl bg-surface/20 border border-border/30">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-medium text-foreground">{risk.type}</span>
                  <span className={`text-[10px] font-bold capitalize ${severityConfig[risk.severity]}`}>{risk.severity}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-1.5">{risk.description}</p>
                <p className="text-[10px] text-emerald-400 italic">Mitigation: {risk.mitigation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Issues */}
      {data.complianceIssues.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Compliance</p>
          <div className="space-y-2">
            {data.complianceIssues.map((issue, i) => {
              const cfg = statusConfig[issue.status];
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                  <FileWarning className={`h-3.5 w-3.5 ${cfg.color} mt-0.5 shrink-0`} />
                  <div>
                    <p className={`text-[12px] font-medium ${cfg.color}`}>{issue.area}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{issue.details}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform Risks */}
      {data.platformRisks.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Platform Risks</p>
          <div className="space-y-2">
            {data.platformRisks.map((pr, i) => (
              <div key={i} className={`p-3 rounded-xl ${pr.compliant ? "bg-emerald-400/5 border border-emerald-400/15" : "bg-red-400/5 border border-red-400/15"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-foreground">{pr.platform}</span>
                  <span className={`text-[10px] font-bold ${pr.compliant ? "text-emerald-400" : "text-red-400"}`}>
                    {pr.compliant ? "Compliant" : "Issues"}
                  </span>
                </div>
                {pr.issues.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {pr.issues.map((issue, j) => (
                      <p key={j} className="text-[10px] text-muted-foreground">• {issue}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      <div className="p-3 rounded-xl bg-surface/20 border border-border/30">
        <div className="flex items-start gap-2">
          <Scale className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[12px] text-foreground/80 leading-relaxed">{data.insight}</p>
        </div>
      </div>
    </div>
  );
}
