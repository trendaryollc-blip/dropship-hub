"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";

interface SectionErrorBoundaryProps {
  /** Human-readable section name shown in the fallback UI. */
  name: string;
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

/**
 * Wraps a single dashboard section so a crash in one card (bad data, a
 * rendering bug) doesn't take down the whole page. The rest of the
 * dashboard keeps working and the section offers an inline retry.
 */
export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("[Dashboard] Section crashed", {
      section: this.props.name,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/20 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-white mb-1">{this.props.name} couldn&apos;t load</p>
          <p className="text-xs text-muted-foreground mb-3">The rest of your dashboard is working normally.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}