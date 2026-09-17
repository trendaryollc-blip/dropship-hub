"use client";

import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import TrackingPageManager from "@/components/tracking-page/TrackingPageManager";

export default function TrackingPageRoute() {
  return (
    <PageErrorBoundary>
      <TrackingPageManager />
    </PageErrorBoundary>
  );
}
