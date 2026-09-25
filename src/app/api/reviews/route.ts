import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { generateReviewReplyTemplate } from "@/lib/review-importer";
import { getReviews, deleteReview, getImportJobs, getReviewStats } from "@/lib/data/reviews";
import type { ReviewSource, ReviewFilter } from "@/types/reviews";
import { safeErrorMessage } from "@/lib/api-errors";

export const POST = withAuth(async (req: NextRequest, _uid: string) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "import") {
      const { productTitle, source } = body;
      if (!productTitle || !source) {
        return NextResponse.json({ error: "productTitle and source required" }, { status: 400 });
      }

      return NextResponse.json(
        {
          error:
            "Review import needs a supplier review source (AliExpress/CJ API), which is not connected yet. Connect a supplier review source, then import again — the product name and URL you entered are kept.",
        },
        { status: 501 }
      );
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
