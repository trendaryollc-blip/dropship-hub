import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { safeErrorMessage } from "@/lib/api-errors";
import { getSuppliers } from "@/lib/supplier-service";
import {
  searchSupplierPlatforms,
  buildSupplierProfiles,
  getSupplierPlatformStatuses,
  DEFAULT_SEARCH_DEADLINE_MS,
  type SupplierPlatformEvent,
} from "@/lib/supplier-platform-search";
import { parseSupplierQuery, scoreSupplierMatch } from "@/lib/search/supplier-query";
import { enforceSearchDailyLimit } from "@/lib/ai/tool-rate-limit";
import type { SupplierProfile } from "@/types/supplier";

const logger = createLogger({ route: "api/suppliers/search-all" });

export const maxDuration = 60;

const MAX_QUERY_LENGTH = 200;
const MAX_PLATFORMS = 20;
const MAX_SUPPLIERS = 60;
const PLATFORM_ID_PATTERN = /^[a-z0-9_]+$/;
const STREAM_MEDIA_TYPE = "application/x-ndjson";

function sanitizeSearchInput(body: unknown): {
  error?: { message: string; status: number };
  query?: string;
  platforms?: string[];
} {
  if (!body || typeof body !== "object") {
    return { error: { message: "Invalid request body", status: 400 } };
  }
  const record = body as Record<string, unknown>;

  if (typeof record.query !== "string") {
    return { error: { message: "Query is required", status: 400 } };
  }
  const rawQuery = record.query.trim();
  if (rawQuery.length === 0) {
    return { error: { message: "Query is required", status: 400 } };
  }
  if (rawQuery.length > MAX_QUERY_LENGTH) {
    return {
      error: { message: `Query is too long (max ${MAX_QUERY_LENGTH} characters)`, status: 400 },
    };
  }

  let platforms: string[] | undefined;
  if (record.platforms !== undefined) {
    if (!Array.isArray(record.platforms)) {
      return { error: { message: "platforms must be an array", status: 400 } };
    }
    platforms = [
      ...new Set(
        record.platforms
          .filter(
            (p): p is string =>
              typeof p === "string" &&
              p.length > 0 &&
              p.length <= 50 &&
              PLATFORM_ID_PATTERN.test(p)
          )
      ),
    ].slice(0, MAX_PLATFORMS);
  }

  return { query: rawQuery, platforms };
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json().catch(() => null);
    const sanitized = sanitizeSearchInput(body);
    if (sanitized.error) {
      return NextResponse.json({ error: sanitized.error.message }, { status: sanitized.error.status });
    }

    const query = sanitized.query as string;
    const platformIds = sanitized.platforms;

    const budget = await enforceSearchDailyLimit(uid);
    if (!budget.allowed) {
      return NextResponse.json({ error: budget.error }, { status: 429 });
    }

    const runSearch = async (
      emit?: (chunk: Record<string, unknown>) => void
    ): Promise<Record<string, unknown>> => {
      const outcome = await searchSupplierPlatforms(query, platformIds, {
        deadlineMs: DEFAULT_SEARCH_DEADLINE_MS,
        onPlatformComplete: emit
          ? (event: SupplierPlatformEvent) => {
              emit({
                type: "platform",
                platform: event.platform,
                name: event.name,
                sources: event.sources.length,
                listings: event.sources.reduce((sum, source) => sum + source.listingCount, 0),
                suppliers: buildSupplierProfiles(event.sources, query),
                error: event.error ?? null,
              });
            }
          : undefined,
      });
      const discovered = buildSupplierProfiles(outcome.sources, query);

      let local: SupplierProfile[] = [];
      try {
        local = await getSuppliers();
      } catch (error) {
        logger.warn("local supplier directory unavailable", {
          error: safeErrorMessage(error, "load failed"),
        });
      }

      const seen = new Set(discovered.map((d) => d.id));
      const merged = [...discovered, ...local.filter((l) => !seen.has(l.id))];
      const tokens = parseSupplierQuery(query);
      const ranked = merged
        .map((supplier) => ({ supplier, score: scoreSupplierMatch(supplier, tokens) }))
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.supplier)
        .slice(0, MAX_SUPPLIERS);

      logger.info("supplier platform search completed", {
        query,
        discovered: discovered.length,
        errors: outcome.errors.length,
        total: ranked.length,
      });

      return {
        query,
        suppliers: ranked,
        total: ranked.length,
        discoveredCount: discovered.length,
        keywords: outcome.keywords,
        platformErrors: outcome.errors,
        sources: outcome.sources.map((s) => ({
          platform: s.platformId,
          store: s.storeName,
          listings: s.listingCount,
        })),
      };
    };

    const acceptHeader =
      typeof request.headers?.get === "function" ? (request.headers.get("accept") ?? "") : "";
    const wantsStream = acceptHeader.includes(STREAM_MEDIA_TYPE);

    if (!wantsStream) {
      return NextResponse.json(await runSearch());
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (chunk: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
          } catch {
            // client disconnected mid-stream
          }
        };
        try {
          emit({ type: "done", ...(await runSearch(emit)) });
        } catch (error) {
          emit({ type: "error", error: safeErrorMessage(error, "Supplier search failed") });
        } finally {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": STREAM_MEDIA_TYPE,
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    logger.error("supplier search-all failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: safeErrorMessage(error, "Supplier search failed") },
      { status: 500 }
    );
  }
}, LIMITS.PLATFORM_SEARCH);

export const GET = withAuth(async () => {
  try {
    const platforms = await getSupplierPlatformStatuses();
    return NextResponse.json({ platforms });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load supplier platforms") },
      { status: 500 }
    );
  }
}, LIMITS.PLATFORM_SEARCH);
