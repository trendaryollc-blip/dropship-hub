import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { generateReviewReplyTemplate } from "@/lib/review-importer";
import {
  getReviews,
  deleteReview,
  getImportJobs,
  getReviewStats,
  addReviews,
  addImportJob,
} from "@/lib/data/reviews";
import {
  ImportReviewsInputSchema,
  type ReviewSource,
  type ReviewFilter,
} from "@/types/reviews";
import {
  parseReviewsCsv,
  fetchAmazonReviewRows,
  extractAsin,
  type ImportedReviewRow,
} from "@/lib/reviews/import-service";
import {
  ConfigMissingError,
  QuotaExhaustedError,
  isAuthError,
  isQuotaError,
} from "@/lib/api-keys/pool";
import { safeErrorMessage, PublicError } from "@/lib/api-errors";

const NOT_CONNECTED: Record<string, string> = {
  aliexpress:
    "AliExpress review import is not connected yet — no AliExpress review source is set up, so nothing was imported. Use CSV upload or Amazon (product URL) instead.",
  cj: "CJ review import is not connected yet — no CJ review source is set up, so nothing was imported. Use CSV upload or Amazon (product URL) instead.",
  ebay: "eBay review import is not connected yet — no eBay review source is set up, so nothing was imported. Use CSV upload or Amazon (product URL) instead.",
};

async function importReviews(body: Record<string, unknown>, uid: string) {
  const parsedInput = ImportReviewsInputSchema.safeParse(body);
  if (!parsedInput.success) {
    const issue = parsedInput.error.issues[0];
    const field = issue && issue.path.length > 0 ? String(issue.path[0]) : "input";
    const message = issue ? issue.message : "Invalid import request";
    return NextResponse.json({ error: `${field}: ${message}` }, { status: 400 });
  }

  const { productTitle, productUrl, source, maxReviews, csv } = parsedInput.data;
  const startedAt = new Date().toISOString();

  let rows: ImportedReviewRow[];
  let totalFound: number;
  let skipped: number;

  try {
    if (source === "csv") {
      if (!csv?.trim()) {
        return NextResponse.json(
          {
            error:
              "Attach a CSV file first — export reviews as CSV (columns: rating, author, content) and select it above. Nothing was imported.",
          },
          { status: 400 }
        );
      }
      const result = parseReviewsCsv(csv, maxReviews);
      rows = result.rows;
      totalFound = result.totalFound;
      skipped = result.skipped;
    } else if (source === "amazon") {
      const asin = extractAsin(productUrl);
      if (!asin) {
        return NextResponse.json(
          {
            error:
              "Couldn't find an Amazon product ID (ASIN) in that URL — paste the full product page link (…/dp/B0XXXXXXXX). Nothing was imported.",
          },
          { status: 400 }
        );
      }
      const fetched = await fetchAmazonReviewRows(asin, maxReviews);
      rows = fetched.rows;
      totalFound = fetched.totalFound;
      skipped = 0;
    } else {
      return NextResponse.json(
        { error: NOT_CONNECTED[source] ?? "This review source is not connected yet." },
        { status: 501 }
      );
    }
  } catch (error) {
    if (error instanceof ConfigMissingError) {
      return NextResponse.json({ error: error.message }, { status: 501 });
    }
    if (error instanceof QuotaExhaustedError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof PublicError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (isAuthError(error)) {
      return NextResponse.json(
        {
          error:
            "Rainforest rejected the API key — update RAINFOREST_API_KEY (Settings → API Keys). Nothing was imported.",
        },
        { status: 501 }
      );
    }
    if (isQuotaError(error)) {
      return NextResponse.json(
        { error: "The Rainforest API rate limit was hit — try again later. Nothing was imported." },
        { status: 429 }
      );
    }
    throw error;
  }

  const title = productTitle.trim();
  const docs = rows.map((row) => ({
    productId: "",
    productTitle: title,
    source,
    sourceReviewId: row.sourceReviewId,
    author: row.author,
    rating: row.rating,
    title: row.title || undefined,
    content: row.content,
    images: row.images,
    verified: row.verified,
    helpful: 0,
    syncStatus: "pending" as const,
  }));

  await addReviews(uid, docs);
  const imported = docs.length;
  const jobId = await addImportJob(uid, {
    productTitle: title,
    productUrl: productUrl.trim(),
    source,
    status: "completed",
    totalFound: Math.max(totalFound, imported),
    imported,
    skipped,
    failed: 0,
    errors: [],
    startedAt,
    completedAt: new Date().toISOString(),
  });

  return NextResponse.json({ imported, skipped, totalFound, jobId: jobId ?? null });
}

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "import") {
      return await importReviews(body, uid);
    }

    if (action === "respond") {
      const { review } = body;
      const response = generateReviewReplyTemplate(review);
      return NextResponse.json({ success: true, response, template: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed") },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "list";

    if (type === "stats") {
      const stats = await getReviewStats(uid);
      return NextResponse.json({ stats });
    }

    if (type === "jobs") {
      const jobs = await getImportJobs(uid);
      return NextResponse.json({ jobs });
    }

    const filter: ReviewFilter = {};
    if (searchParams.get("source")) filter.source = searchParams.get("source") as ReviewSource;
    if (searchParams.get("rating")) filter.rating = Number(searchParams.get("rating"));
    if (searchParams.get("limit")) filter.limit = Number(searchParams.get("limit"));

    const reviews = await getReviews(uid, filter);
    return NextResponse.json({ reviews });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed") },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const deleted = await deleteReview(uid, id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed") },
      { status: 500 }
    );
  }
});
