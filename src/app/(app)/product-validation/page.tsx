"use client";

import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import ProductValidationPage from "@/components/product-validation/ProductValidationPage";

export default function ProductValidationRoute() {
  return (
    <PageErrorBoundary>
      <ProductValidationPage />
    </PageErrorBoundary>
  );
}
