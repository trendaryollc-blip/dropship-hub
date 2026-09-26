/**
 * Server-side instrumentation (Next.js file convention).
 * Sentry initializes per-runtime only when a DSN is configured.
 */
import * as Sentry from "@sentry/nextjs";

export async function register(): Promise<void> {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || process.env.NODE_ENV === "test") return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
