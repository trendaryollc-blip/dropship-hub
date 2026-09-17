"use client";

import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import ReviewsPage from "@/components/reviews/ReviewsPage";

export default function ReviewsRoute() {
  return (
    <PageErrorBoundary>
      <ReviewsPage />
    </PageErrorBoundary>
  );
}
