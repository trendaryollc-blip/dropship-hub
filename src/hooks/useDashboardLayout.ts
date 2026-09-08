"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { defaultLayout, type BentoLayout } from "@/components/dashboard/BentoLayoutPresets";

interface UseDashboardLayoutResult {
  layout: BentoLayout;
  setLayout: (layout: BentoLayout) => void;
  resetToDefault: () => void;
  isLoading: boolean;
}

export function useDashboardLayout(): UseDashboardLayoutResult {
  const { user } = useAuth();
  const [layout, setLayoutState] = useState<BentoLayout>(defaultLayout);
  const [isLoading, setIsLoading] = useState(true);

  const { data, isLoading: swrLoading } = useAPI<{ layout: BentoLayout } | null>(
    user ? "/api/settings/dashboard-layout" : null
  );

  useEffect(() => {
    if (!swrLoading) {
      if (data?.layout) {
        setLayoutState(data.layout);
      }
      setIsLoading(false);
    }
  }, [data, swrLoading]);

  const setLayout = useCallback(
    async (newLayout: BentoLayout) => {
      setLayoutState(newLayout);
      if (!user) return;

      try {
        await fetch("/api/settings/dashboard-layout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout: newLayout }),
        });
      } catch (error) {
        console.error("[useDashboardLayout] Failed to save layout:", error);
      }
    },
    [user]
  );

  const resetToDefault = useCallback(() => {
    setLayout(defaultLayout);
    if (user) {
      fetch("/api/settings/dashboard-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: defaultLayout }),
      }).catch(console.error);
    }
  }, [user]);

  return { layout, setLayout, resetToDefault, isLoading };
}
