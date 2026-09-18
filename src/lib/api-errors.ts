import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * An error whose message was authored by our own code and is safe to expose
 * to API clients (validation hints, provider setup instructions, etc.).
 *
 * Only `PublicError` messages are forwarded in HTTP responses. Every other
 * error is replaced by a generic fallback so internal details — Firestore
 * payloads, provider response bodies, stack context, env values — can never
 * leak to the client. See safeErrorMessage() usage in src/app/api/**\/route.ts.
 */
export class PublicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicError";
  }
}

/**
 * Return `error.message` only when the error was explicitly marked safe to
 * expose (PublicError); otherwise return the caller-supplied fallback.
 */
export function safeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof PublicError && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

/**
 * Log an unexpected error server-side and return a sanitized JSON response.
 */
export function errorResponse(error: unknown, fallback: string, status = 500): NextResponse {
  logger.error(fallback, { error: error instanceof Error ? error.message : String(error) });
  return NextResponse.json({ error: fallback }, { status });
}