/**
 * Client-side instrumentation (Next.js file convention).
 * Runs in the browser before the app becomes interactive.
 *
 * - Sentry: error monitoring, only when NEXT_PUBLIC_SENTRY_DSN is set.
 * - PostHog: pageviews + event helper, only when NEXT_PUBLIC_POSTHOG_KEY is set.
 */
import * as Sentry from "@sentry/nextjs";
import { initAnalytics, trackPageview } from "@/lib/analytics";

try {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV !== "test",
    });
  }
} catch {
  /* monitoring must never break the app */
}

initAnalytics();

export function onRouterTransitionStart(url: string): void {
  trackPageview(url);
}
