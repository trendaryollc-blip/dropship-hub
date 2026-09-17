"use client";

import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import RefundCascadePage from "@/components/refund-cascade/RefundCascadePage";

export default function RefundCascadeRoute() {
  return (
    <PageErrorBoundary>
      <RefundCascadePage />
    </PageErrorBoundary>
  );
}
