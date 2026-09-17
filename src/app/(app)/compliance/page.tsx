"use client";

import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import CompliancePage from "@/components/compliance/CompliancePage";

export default function ComplianceRoute() {
  return (
    <PageErrorBoundary>
      <CompliancePage />
    </PageErrorBoundary>
  );
}
