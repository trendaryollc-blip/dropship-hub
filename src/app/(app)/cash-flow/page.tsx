"use client";

import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import CashFlowPage from "@/components/cash-flow/CashFlowPage";

export default function CashFlowRoute() {
  return (
    <PageErrorBoundary>
      <CashFlowPage />
    </PageErrorBoundary>
  );
}
