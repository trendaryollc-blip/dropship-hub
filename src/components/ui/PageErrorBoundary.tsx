"use client";

import { useState } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  const [retryKey, setRetryKey] = useState(0);

  return (
    <ErrorBoundary key={retryKey} onReset={() => setRetryKey((k) => k + 1)}>
      {children}
    </ErrorBoundary>
  );
}
