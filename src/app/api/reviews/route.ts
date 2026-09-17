import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { simulateImport, generateReviewResponse } from "@/lib/review-importer";
import { addReviews, getReviews, deleteReview, addImportJob, getImportJobs, getReviewStats } from "@/lib/data/reviews";
import type { ReviewSource, ReviewFilter } from "@/types/reviews";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "import") {
      const { productTitle, productUrl, source, maxReviews } = body;
      if (!productTitle || !source) {
        return NextResponse.json({ error: "productTitle and source required" }, { status: 400 });
      }

      const { job, reviews } = simulateImport({ productTitle, productUrl: productUrl || "", source, maxReviews });

      const jobId = await addImportJob(uid, { ...job, startedAt: job.startedAt, completedAt: job.completedAt } as any);

      if (reviews.length > 0) {
        await addReviews(uid, reviews.map((r) => ({
          ...r,
          syncedTo: [],
        } as any)));
      }

      return NextResponse.json({ success: true, job: { ...job, id: jobId }, imported: reviews.length });
    }

    if (action === "respond") {
      const { reviewId, review } = body;
      const response = generateReviewResponse(review);
      return NextResponse.json({ success: true, response });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
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
      { error: error instanceof Error ? error.message : "Failed" },
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
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});
