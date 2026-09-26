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
  identify?: (id: string, props?: Record<string, unknown>) => void;
  reset?: () => void;
};

let posthogClient: PostHogClient | null = null;
let identifiedId: string | null = null;
let identifiedProps: Record<string, unknown> | undefined;

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
      if (identifiedId) {
        posthog.identify?.(identifiedId, identifiedProps);
      }
      posthog.capture("$pageview");
    })
    .catch(() => {
      /* analytics must never break the app */
    });
}

/** Attribute subsequent events to a signed-in user (idempotent, safe pre-init). */
export function identifyUser(userId: string, props?: Record<string, unknown>): void {
  if (!userId) return;
  identifiedId = userId;
  identifiedProps = props;
  if (posthogClient?.identify) {
    try {
      posthogClient.identify(userId, props);
    } catch {
      /* ignore */
    }
  }
}

/** Clear the identified user on sign-out so sessions don't bleed together. */
export function resetAnalytics(): void {
  identifiedId = null;
  identifiedProps = undefined;
  if (posthogClient?.reset) {
    try {
      posthogClient.reset();
    } catch {
      /* ignore */
    }
  }
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
