/**
 * Lightweight analytics facade.
 *
 * - PostHog events via posthog-js (only when NEXT_PUBLIC_POSTHOG_KEY is set).
 * - Safe no-op everywhere else (server, tests, missing config).
 * - Vercel Analytics / Speed Insights are rendered separately in the root
 *   layout and self-disable outside Vercel.
 */

type PostHogClient = {
  capture: (event: string, props?: Record<string, unknown>) => void;
};

let posthogClient: PostHogClient | null = null;

export function initAnalytics(): void {
  if (typeof window === "undefined" || posthogClient) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  void import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        capture_pageview: false, // we capture explicitly (initial + per navigation)
        capture_pageleave: true,
        person_profiles: "identified_only",
        autocapture: true,
        disable_session_recording: true,
      });
      posthogClient = posthog;
      posthog.capture("$pageview");
    })
    .catch(() => {
      /* analytics must never break the app */
    });
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!posthogClient) return;
  try {
    posthogClient.capture(event, props);
  } catch {
    /* ignore */
  }
}

export function trackPageview(url: string): void {
  if (!posthogClient) return;
  try {
    const absolute = typeof window !== "undefined" ? new URL(url, window.location.origin).href : url;
    posthogClient.capture("$pageview", { $current_url: absolute });
  } catch {
    /* ignore */
  }
}
