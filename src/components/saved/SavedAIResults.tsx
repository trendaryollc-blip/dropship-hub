"use client";

import { useEffect, useRef } from "react";
import { X, CheckCircle2, XCircle, Info, Loader2, AlertTriangle, Ban } from "lucide-react";

export interface AIResult {
  tool: string;
  success: boolean;
  summary: string;
  data?: unknown;
  error?: string;
  needsConfirmation?: boolean;
  executionId?: string;
  confirming?: boolean;
  cancelled?: boolean;
  titlePrefix?: string;
  id?: string;
}

interface SavedAIResultsProps {
  open: boolean;
  onClose: () => void;
  title: string;
  results: AIResult[];
  loading: boolean;
  onConfirm?: (result: AIResult) => void;
  onCancel?: (result: AIResult) => void;
}

function formatData(data: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export default function SavedAIResults({ open, onClose, title, results, loading, onConfirm, onCancel }: SavedAIResultsProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const successCount = results.filter((r) => r.success && !r.needsConfirmation && !r.cancelled).length;
  const failCount = results.filter((r) => !r.success && !r.needsConfirmation && !r.cancelled).length;
  const awaitingCount = results.filter((r) => r.needsConfirmation).length;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="glass rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
            {results.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {successCount} succeeded
                {failCount > 0 ? `, ${failCount} failed` : ""}
                {awaitingCount > 0 ? `, ${awaitingCount} awaiting confirmation` : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 text-accent animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Running AI analysis...</p>
              <p className="text-xs text-muted-foreground/60 mt-1">This may take a moment</p>
            </div>
          )}

          {results.map((result, i) => {
            const isAwaiting = !!result.needsConfirmation;
            const isCancelled = !!result.cancelled;
            const displaySummary = (result.titlePrefix ? `${result.titlePrefix}: ` : "") + result.summary;
            const cardCls = isCancelled
              ? "bg-gray-500/5 border-gray-400/20"
              : isAwaiting
                ? "bg-orange-500/5 border-orange-400/20"
                : result.success
                  ? "bg-emerald-500/5 border-emerald-400/20"
                  : "bg-red-500/5 border-red-400/20";
            const badge = isCancelled
              ? { cls: "bg-gray-400/10 text-gray-400", label: "Cancelled" }
              : isAwaiting
                ? { cls: "bg-orange-400/10 text-orange-400", label: "Awaiting confirmation" }
                : result.success
                  ? { cls: "bg-emerald-400/10 text-emerald-400", label: "Success" }
                  : { cls: "bg-red-400/10 text-red-400", label: "Failed" };
            const iconCls = isCancelled
              ? "text-gray-400"
              : isAwaiting
                ? "text-orange-400"
                : result.success
                  ? "text-emerald-400"
                  : "text-red-400";
            return (
            <div
              key={i}
              className={`rounded-xl border p-4 transition-all ${cardCls}`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {isCancelled ? (
                    <Ban className="h-4.5 w-4.5 text-gray-400" />
                  ) : isAwaiting ? (
                    <AlertTriangle className="h-4.5 w-4.5 text-orange-400" />
                  ) : result.success ? (
                    <CheckCircle2 className={`h-4.5 w-4.5 ${iconCls}`} />
                  ) : (
                    <XCircle className={`h-4.5 w-4.5 ${iconCls}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">{result.tool}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{displaySummary}</p>
                  {result.error && (
                    <p className="text-xs text-red-400 mt-1">{result.error}</p>
                  )}
                  {result.data != null && !isAwaiting && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors">
                        View details
                      </summary>
                      <pre className="mt-2 p-3 rounded-lg bg-surface text-[11px] text-muted-foreground overflow-x-auto max-h-48 overflow-y-auto">
                        {formatData(result.data)}
                      </pre>
                    </details>
                  )}
                  {isAwaiting && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => onCancel?.(result)}
                        disabled={result.confirming}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground hover:border-red-400/30 disabled:opacity-40 transition-all"
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => onConfirm?.(result)}
                        disabled={result.confirming}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-all"
                      >
                        {result.confirming ? "Running..." : "Approve & Run"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}

          {loading && results.length > 0 && (
            <div className="flex items-center gap-2 py-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Processing remaining items...</span>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Info className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No results to display</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-surface border border-border text-sm font-medium text-foreground hover:bg-surface-hover transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
