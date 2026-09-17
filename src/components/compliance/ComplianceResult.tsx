"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldOff,
  ChevronDown,
  ChevronUp,
  Tag,
  FileText,
  Ban,
  Zap,
  Image,
  Globe,
  Download,
  Copy,
  AlertOctagon,
} from "lucide-react";
import type {
  ComplianceReport,
  ComplianceCheckResult,
  ComplianceCheckType,
  ComplianceFlag,
  PatentCheckResult,
  ExportControlResult,
} from "@/types/compliance";

const CHECK_ICONS: Record<ComplianceCheckType, typeof Tag> = {
  trademark: Tag,
  dmca: FileText,
  restricted_item: Ban,
  ad_policy: Zap,
  image_originality: Image,
  brand_registry: Globe,
  patent: FileText,
  export_control: Globe,
};

const CHECK_LABELS: Record<ComplianceCheckType, string> = {
  trademark: "Trademark Check",
  dmca: "DMCA Risk Assessment",
  restricted_item: "Restricted Item Check",
  ad_policy: "Ad Policy Compliance",
  image_originality: "Image Originality",
  brand_registry: "Brand Registry",
  patent: "Patent Check",
  export_control: "Export Control",
};

interface Props {
  report: ComplianceReport;
}

export default function ComplianceResult({ report }: Props) {
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  const riskColors = {
    safe: "text-emerald-400",
    low: "text-emerald-400",
    medium: "text-amber-400",
    high: "text-red-400",
    blocked: "text-red-500",
  };

  const riskBg = {
    safe: "bg-emerald-500/10 border-emerald-500/20",
    low: "bg-emerald-500/10 border-emerald-500/20",
    medium: "bg-amber-500/10 border-amber-500/20",
    high: "bg-red-500/10 border-red-500/20",
    blocked: "bg-red-600/10 border-red-600/20",
  };

  const riskBadgeBg = {
    safe: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    high: "bg-red-500/15 text-red-400 border-red-500/30",
    blocked: "bg-red-600/15 text-red-500 border-red-600/30",
  };

  const riskIcons = {
    safe: CheckCircle2,
    low: CheckCircle2,
    medium: AlertTriangle,
    high: XCircle,
    blocked: ShieldOff,
  };

  const RiskIcon = riskIcons[report.riskLevel];

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${report.productTitle.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const summary = `Compliance Report: ${report.productTitle}\nScore: ${report.overallScore}/100\nRisk: ${report.riskLevel}\nCan List: ${report.canList}\nChecks: ${report.checks.length}\nFlags: ${report.flags.length}\n\n${report.recommendations.join("\n")}`;
    await navigator.clipboard.writeText(summary);
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy Report
        </button>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download Report
        </button>
      </div>

      {/* Overall Verdict */}
      <div className={`glass rounded-2xl p-6 border ${riskBg[report.riskLevel]}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${riskBg[report.riskLevel]}`}>
              <RiskIcon className={`h-8 w-8 ${riskColors[report.riskLevel]}`} />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">
                {report.canList ? "Safe to List" : "Do NOT List"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${
                    riskBadgeBg[report.riskLevel]
                  }`}
                >
                  <RiskIcon className="h-3 w-3" />
                  {report.riskLevel.charAt(0).toUpperCase() + report.riskLevel.slice(1)} Risk
                </span>
                <p className="text-sm text-muted-foreground">
                  {report.riskLevel === "safe" && "All checks passed. No compliance issues detected."}
                  {report.riskLevel === "low" && "Minor warnings found. Review before listing."}
                  {report.riskLevel === "medium" && "Warnings detected. Address issues before listing."}
                  {report.riskLevel === "high" && "Violations found. Fix issues before listing."}
                  {report.riskLevel === "blocked" && "Product is blocked. Do NOT list this product."}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-display text-3xl font-bold ${riskColors[report.riskLevel]}`}>
              {report.overallScore}
            </div>
            <div className="text-xs text-muted-foreground">/100</div>
          </div>
        </div>

        {/* Flags */}
        {report.flags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {report.flags.map((flag, i) => (
              <FlagBadge key={i} flag={flag} />
            ))}
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-surface/50 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations</p>
            <ul className="space-y-1">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                  <span className="text-accent mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Individual Checks */}
      {report.checks.map((check) => (
        <CheckCard
          key={check.checkType}
          check={check}
          expanded={expandedCheck === check.checkType}
          onToggle={() => setExpandedCheck(expandedCheck === check.checkType ? null : check.checkType)}
        />
      ))}
    </div>
  );
}

function CheckCard({ check, expanded, onToggle }: { check: ComplianceCheckResult; expanded: boolean; onToggle: () => void }) {
  const Icon = CHECK_ICONS[check.checkType] || ShieldCheck;

  const severityConfig = {
    pass: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
    violation: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
    critical: { icon: ShieldOff, color: "text-red-500", bg: "bg-red-600/10" },
  };

  const riskLevelColors = {
    none: "text-emerald-400",
    low: "text-emerald-400",
    moderate: "text-amber-400",
    high: "text-red-400",
  };

  const riskLevelBg = {
    none: "bg-emerald-500/15 border-emerald-500/30",
    low: "bg-emerald-500/15 border-emerald-500/30",
    moderate: "bg-amber-500/15 border-amber-500/30",
    high: "bg-red-500/15 border-red-500/30",
  };

  const sev = severityConfig[check.severity];
  const SevIcon = sev.icon;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${sev.bg}`}>
            <Icon className={`h-4 w-4 ${sev.color}`} />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold text-foreground">{CHECK_LABELS[check.checkType]}</h4>
            <p className="text-xs text-muted-foreground">{check.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <SevIcon className={`h-4 w-4 ${sev.color}`} />
            <span className={`text-sm font-bold ${sev.color}`}>{check.score}</span>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.04] pt-3 space-y-3">
          <p className="text-sm text-muted-foreground">{check.description}</p>

          {/* Details */}
          <div className="space-y-1.5">
            {check.details.map((detail, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-surface/50">
                <span className="text-muted-foreground">{detail.label}</span>
                <div className="flex items-center gap-2">
                  {detail.evidence && (
                    <span className="text-xs text-muted-foreground/70 max-w-[200px] truncate">{detail.evidence}</span>
                  )}
                  <span className={`font-medium ${
                    detail.status === "pass" ? "text-emerald-400" :
                    detail.status === "warn" ? "text-amber-400" : "text-red-400"
                  }`}>
                    {detail.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Patent-specific details */}
          {check.checkType === "patent" && (
            <PatentDetails check={check as PatentCheckResult} riskLevelColors={riskLevelColors} riskLevelBg={riskLevelBg} />
          )}

          {/* Export Control-specific details */}
          {check.checkType === "export_control" && (
            <ExportControlDetails check={check as ExportControlResult} />
          )}

          {/* Recommendation */}
          <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
            <p className="text-xs text-foreground/80">
              <span className="font-semibold text-accent">Recommendation:</span> {check.recommendation}
            </p>
          </div>

          {check.blocked && (
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                <ShieldOff className="h-3.5 w-3.5" />
                This product is BLOCKED. Do NOT list it.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PatentDetails({
  check,
  riskLevelColors,
  riskLevelBg,
}: {
  check: PatentCheckResult;
  riskLevelColors: Record<string, string>;
  riskLevelBg: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Patent Risk Assessment</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface/50 border border-border/50">
          <span className="text-xs text-muted-foreground">Design Patent Risk</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${riskLevelBg[check.designPatentRisk]} ${riskLevelColors[check.designPatentRisk]}`}>
            {check.designPatentRisk.charAt(0).toUpperCase() + check.designPatentRisk.slice(1)}
          </span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface/50 border border-border/50">
          <span className="text-xs text-muted-foreground">Utility Patent Risk</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${riskLevelBg[check.utilityPatentRisk]} ${riskLevelColors[check.utilityPatentRisk]}`}>
            {check.utilityPatentRisk.charAt(0).toUpperCase() + check.utilityPatentRisk.slice(1)}
          </span>
        </div>
      </div>

      {check.suspectedInfringements.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suspected Infringements</p>
          {check.suspectedInfringements.map((inf, i) => (
            <div key={i} className="p-3 rounded-lg bg-surface/50 border border-border/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertOctagon className={`h-3.5 w-3.5 ${riskLevelColors[inf.risk]}`} />
                  <span className="text-xs font-semibold text-foreground capitalize">{inf.patentType} Patent</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${riskLevelBg[inf.risk]} ${riskLevelColors[inf.risk]}`}>
                  {inf.risk.charAt(0).toUpperCase() + inf.risk.slice(1)} Risk
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{inf.description}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                {inf.evidence && <span>Evidence: {inf.evidence}</span>}
                {inf.owner && <span>• Owner: {inf.owner}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExportControlDetails({ check }: { check: ExportControlResult }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Export Control Details</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface/50 border border-border/50">
          <span className="text-xs text-muted-foreground">Dual-Use Classification</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
            check.classifiedAsDualUse
              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          }`}>
            {check.classifiedAsDualUse ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface/50 border border-border/50">
          <span className="text-xs text-muted-foreground">Export License Required</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
            check.licenseRequired
              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          }`}>
            {check.licenseRequired ? "Yes" : "No"}
          </span>
        </div>
      </div>

      {check.embargoedMarkets.length > 0 && (
        <div className="p-2.5 rounded-lg bg-surface/50 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Embargoed Markets</p>
          <div className="flex flex-wrap gap-1">
            {check.embargoedMarkets.map((market, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                {market}
              </span>
            ))}
          </div>
        </div>
      )}

      {check.sanctionsFlags.length > 0 && (
        <div className="p-2.5 rounded-lg bg-surface/50 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Sanctions Flags</p>
          <div className="flex flex-wrap gap-1">
            {check.sanctionsFlags.map((flag, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {check.restrictedMarkets.length > 0 && (
        <div className="p-2.5 rounded-lg bg-surface/50 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Restricted Markets</p>
          <div className="flex flex-wrap gap-1">
            {check.restrictedMarkets.map((market, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {market}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FlagBadge({ flag }: { flag: ComplianceFlag }) {
  const config = {
    pass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    violation: "bg-red-500/10 text-red-400 border-red-500/20",
    critical: "bg-red-600/10 text-red-500 border-red-600/20",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border ${config[flag.severity]}`}>
      {flag.actionRequired && <ShieldOff className="h-3 w-3" />}
      {flag.message}
    </span>
  );
}
