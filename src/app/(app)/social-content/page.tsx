"use client";

import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import SocialContentPage from "@/components/social-content/SocialContentPage";

export default function SocialContentRoute() {
  return (
    <PageErrorBoundary>
      <SocialContentPage />
    </PageErrorBoundary>
  );
}
