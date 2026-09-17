"use client";

import MonitoringPage from "@/components/monitoring/MonitoringPage";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function PriceMonitorRoute() {
  return (
    <ErrorBoundary>
      <MonitoringPage />
    </ErrorBoundary>
  );
}
