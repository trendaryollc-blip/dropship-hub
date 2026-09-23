"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldOff,
  ShieldCheck,
  Shield,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  Tag,
  FileText,
  Ban,
  Zap,
  Image,
  Globe,
} from "lucide-react";
import type {
  ComplianceDoc,
  ComplianceCheckType,
  ComplianceFlag,
} from "@/types/compliance";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Props {
  checks: ComplianceDoc[];
  onDelete: (id: string) => void;
}

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

const RISK_FILTERS: { key: string; label: string; icon: typeof Shield; color?: string }[] = [
  { key: "all", label: "All", icon: Shield },
  { key: "safe", label: "Safe", icon: CheckCircle2, color: "text-emerald-400" },
  { key: "low", label: "Low Risk", icon: CheckCircle2, color: "text-emerald-400" },
  { key: "medium", label: "Warning", icon: AlertTriangle, color: "text-amber-400" },
  { key: "high", label: "Violation", icon: XCircle, color: "text-red-400" },
  { key: "blocked", label: "Blocked", icon: ShieldOff, color: "text-red-500" },
];

const riskConfig = {
  safe: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Safe" },
  low: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Low Risk" },
  medium: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", label: "Warning" },
  high: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Violation" },
  blocked: { icon: ShieldOff, color: "text-red-500", bg: "bg-red-600/10", label: "Blocked" },
};

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

const riskIcons = {
  safe: CheckCircle2,
  low: CheckCircle2,
  medium: AlertTriangle,
  high: XCircle,
  blocked: ShieldOff,
};

const barColors: Record<string, string> = {
  safe: "bg-emerald-400",
  low: "bg-emerald-500",
  medium: "bg-amber-400",
  high: "bg-red-400",
  blocked: "bg-red-500",
};

function DetailView({
  check,
  onBack,
  expandedCheck,
  onToggleExpand,
}: {
  check: ComplianceDoc;
  onBack: () => void;
  expandedCheck: string | null;
  onToggleExpand: (key: string | null) => void;
}) {
  const report = check.report;
  const RiskIcon = riskIcons[check.riskLevel];

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to list
      </button>

      <div className={`glass rounded-2xl p-6 border ${riskBg[check.riskLevel]}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${riskBg[check.riskLevel]}`}>
              <RiskIcon className={`h-8 w-8 ${riskColors[check.riskLevel]}`} />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">
                {check.canList ? "Safe to List" : "Do NOT List"}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {check.productTitle} &middot; {check.category}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-display text-3xl font-bold ${riskColors[check.riskLevel]}`}>
              {check.overallScore}
            </div>
            <div className="text-xs text-muted-foreground">/100</div>
          </div>
        </div>

        {report?.flags && report.flags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {report.flags.map((flag, i) => (
              <FlagBadge key={i} flag={flag} />
            ))}
          </div>
        )}

        {report?.recommendations && report.recommendations.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-surface/50 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations</p>
            <ul className="space-y-1">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                  <span className="text-accent mt-0.5">&bull;</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!report && (
          <div className="mt-4 p-3 rounded-xl bg-surface/50 border border-border/50">
            <p className="text-xs text-muted-foreground">
              Full report data not available for this check. The product was
              evaluated with a score of {check.overallScore}/100.
            </p>
          </div>
        )}
      </div>

      {report?.checks && report.checks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground px-1">Check Results</h4>
          {report.checks.map((checkResult) => {
            const Icon = CHECK_ICONS[checkResult.checkType] || ShieldCheck;
            const sevConfig = {
              pass: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
              violation: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
              critical: { icon: ShieldOff, color: "text-red-500", bg: "bg-red-600/10" },
            };
            const sev = sevConfig[checkResult.severity];
            const SevIcon = sev.icon;
            const isExpanded = expandedCheck === checkResult.checkType;

            return (
              <div key={checkResult.checkType} className="glass rounded-2xl overflow-hidden">
                <button
                  onClick={() => onToggleExpand(isExpanded ? null : checkResult.checkType)}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${sev.bg}`}>
                      <Icon className={`h-4 w-4 ${sev.color}`} />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-semibold text-foreground">
                        {CHECK_LABELS[checkResult.checkType]}
                      </h4>
                      <p className="text-xs text-muted-foreground">{checkResult.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <SevIcon className={`h-4 w-4 ${sev.color}`} />
                      <span className={`text-sm font-bold ${sev.color}`}>{checkResult.score}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/[0.04] pt-3 space-y-3">
                    <p className="text-sm text-muted-foreground">{checkResult.description}</p>
                    <div className="space-y-1.5">
                      {checkResult.details.map((detail, i) => (
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
                    <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
                      <p className="text-xs text-foreground/80">
                        <span className="font-semibold text-accent">Recommendation:</span>{" "}
                        {checkResult.recommendation}
                      </p>
                    </div>
                    {checkResult.blocked && (
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
          })}
        </div>
      )}

      {report?.flags && report.flags.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Compliance Flags</h4>
          <div className="flex flex-wrap gap-2">
            {report.flags.map((flag, i) => (
              <FlagBadge key={i} flag={flag} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComplianceHistory({ checks, onDelete }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [selectedCheck, setSelectedCheck] = useState<ComplianceDoc | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredChecks = useMemo(
    () =>
      checks.filter((check) => {
        const matchesSearch = check.productTitle
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesRisk =
          riskFilter === "all" || check.riskLevel === riskFilter;
        return matchesSearch && matchesRisk;
      }),
    [checks, searchQuery, riskFilter]
  );

  const riskDistribution = useMemo(() => {
    const dist: Record<string, number> = { safe: 0, low: 0, medium: 0, high: 0, blocked: 0 };
    for (const check of checks) {
      dist[check.riskLevel] = (dist[check.riskLevel] || 0) + 1;
    }
    return dist;
  }, [checks]);

  const totalChecks = checks.length;

  const handleExport = (check: ComplianceDoc) => {
    const data = check.report || {
      productTitle: check.productTitle,
      overallScore: check.overallScore,
      riskLevel: check.riskLevel,
      canList: check.canList,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-${check.productTitle.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedCheck) {
    return (
      <DetailView
        check={selectedCheck}
        onBack={() => {
          setSelectedCheck(null);
          setExpandedCheck(null);
        }}
        expandedCheck={expandedCheck}
        onToggleExpand={setExpandedCheck}
      />
    );
  }

  if (checks.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No compliance checks yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Run your first check to see results here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk Breakdown Bar */}
      {totalChecks > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Risk Distribution</span>
            <span className="text-xs text-muted-foreground">{totalChecks} total</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {(["safe", "low", "medium", "high", "blocked"] as const).map((level) => {
              const count = riskDistribution[level];
              if (count === 0) return null;
              const pct = (count / totalChecks) * 100;
              return (
                <div
                  key={level}
                  className={`${barColors[level]} rounded-full`}
                  style={{ width: `${pct}%` }}
                  title={`${riskConfig[level].label}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {(["safe", "low", "medium", "high", "blocked"] as const).map((level) => {
              const count = riskDistribution[level];
              return (
                <div key={level} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${barColors[level]}`} />
                  <span className="text-[11px] text-muted-foreground">
                    {riskConfig[level].label}: {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by product title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
      </div>

      {/* Risk Filter Chips */}
      <div className="flex flex-wrap gap-1.5">
        {RISK_FILTERS.map((filter) => {
          const FilterIcon = filter.icon;
          const active = riskFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => setRiskFilter(filter.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                active
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "glass text-muted-foreground hover:text-foreground hover:border-white/[0.08]"
              }`}
            >
              <FilterIcon className={`h-3 w-3 ${active ? "" : filter.color || ""}`} />
              {filter.label}
              {filter.key !== "all" && (
                <span className="ml-0.5 opacity-60">{riskDistribution[filter.key] || 0}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* History List */}
      <div className="space-y-2">
        {filteredChecks.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No results match your filters</p>
          </div>
        )}
        {filteredChecks.map((check) => {
          const risk = riskConfig[check.riskLevel];
          const RiskIcon = risk.icon;
          const dateStr = check.createdAt
            ? typeof check.createdAt === "object" && "toDate" in check.createdAt
              ? (check.createdAt as { toDate: () => Date }).toDate().toLocaleDateString()
              : new Date(check.createdAt as string | number).toLocaleDateString()
            : "";
          return (
            <div
              key={check.id}
              className="glass rounded-xl p-4 flex items-center justify-between hover:border-accent/10 transition-all group cursor-pointer"
              onClick={() => setSelectedCheck(check)}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${risk.bg}`}>
                  <RiskIcon className={`h-4 w-4 ${risk.color}`} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {check.productTitle}
                  </h4>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{check.category}</span>
                    <span className="text-xs text-muted-foreground/50">&bull;</span>
                    <span className="text-xs text-muted-foreground">{risk.label}</span>
                    <span className="text-xs text-muted-foreground/50">&bull;</span>
                    <span className="text-xs text-muted-foreground">{dateStr}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div
                    className={`font-display text-lg font-bold ${
                      check.overallScore >= 70
                        ? "text-emerald-400"
                        : check.overallScore >= 40
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {check.overallScore}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {check.flagCount} flag{check.flagCount !== 1 ? "s" : ""}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport(check);
                  }}
                  aria-label={`Export ${check.productTitle} as JSON`}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-colors md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                  title="Export as JSON"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(check.id);
                  }}
                  aria-label={`Delete ${check.productTitle} check`}
                  className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete compliance check?"
        description="This permanently removes the check and its full report from your history. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDeleteId) onDelete(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
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
