"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center max-w-md text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10 border border-red-400/20 mb-5">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-1">
            An unexpected error occurred.
          </p>
          {error.digest && (
            <p className="text-[11px] text-gray-500 font-mono mb-4">
              Error ID: {error.digest}
            </p>
          )}
          <p className="text-xs text-gray-500 mb-6">
            {error.message || "Please try again or contact support."}
          </p>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
