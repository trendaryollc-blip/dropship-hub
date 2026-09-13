"use client";

import React from "react";
import { AlertTriangle, RefreshCw, ChevronDown } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Fulfillment error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="glass rounded-xl p-8 flex flex-col items-center text-center max-w-md mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>

          <h3 className="font-display text-base font-semibold text-foreground mb-2">
            Something went wrong
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            An unexpected error occurred while loading this section.
          </p>

          {this.state.error && (
            <div className="w-full mb-4">
              <button
                onClick={this.toggleDetails}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${
                    this.state.showDetails ? "rotate-180" : ""
                  }`}
                />
                Error details
              </button>
              {this.state.showDetails && (
                <div className="mt-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-left">
                  <p className="text-[11px] text-red-400 font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent/20 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Try Again
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
