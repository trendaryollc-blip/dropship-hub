import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    if (!supplierId) {
      return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
    }

    const reviewsSnap = await db
      .collection("users")
      .doc(uid)
      .collection("supplierReviews")
      .where("supplierId", "==", supplierId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const reviews = reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return NextResponse.json({
        reviews: [],
        communityScore: {
          supplierId,
          totalReviews: 0,
          avgRating: 0,
          breakdownAverages: { productQuality: 0, shippingSpeed: 0, communication: 0, pricing: 0, reliability: 0 },
          verifiedPercentage: 0,
          sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
          topPraise: [],
          topComplaints: [],
        },
      });
    }

    const avgRating = reviews.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.overallRating as number) || 0), 0) / totalReviews;
    const verified = reviews.filter((r: Record<string, unknown>) => r.verified).length;
    const positive = reviews.filter((r: Record<string, unknown>) => (r.overallRating as number) >= 4).length;
    const negative = reviews.filter((r: Record<string, unknown>) => (r.overallRating as number) <= 2).length;
    const neutral = totalReviews - positive - negative;

    const breakdownAverages = {
      productQuality: reviews.reduce((sum: number, r: Record<string, unknown>) => sum + (((r.breakdown as Record<string, unknown>)?.productQuality as number) || 0), 0) / totalReviews,
      shippingSpeed: reviews.reduce((sum: number, r: Record<string, unknown>) => sum + (((r.breakdown as Record<string, unknown>)?.shippingSpeed as number) || 0), 0) / totalReviews,
      communication: reviews.reduce((sum: number, r: Record<string, unknown>) => sum + (((r.breakdown as Record<string, unknown>)?.communication as number) || 0), 0) / totalReviews,
      pricing: reviews.reduce((sum: number, r: Record<string, unknown>) => sum + (((r.breakdown as Record<string, unknown>)?.pricing as number) || 0), 0) / totalReviews,
      reliability: reviews.reduce((sum: number, r: Record<string, unknown>) => sum + (((r.breakdown as Record<string, unknown>)?.reliability as number) || 0), 0) / totalReviews,
    };

    return NextResponse.json({
      reviews,
      communityScore: {
        supplierId,
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        breakdownAverages,
        verifiedPercentage: Math.round((verified / totalReviews) * 100),
        sentimentDistribution: { positive, neutral, negative },
        topPraise: [],
        topComplaints: [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const body = await request.json();

    const {
      supplierId,
      _supplierName,
      overallRating,
      breakdown,
      title,
      body: reviewBody,
      photos,
      orderVolume,
      timeWorkingWithSupplier,
    } = body;

    if (!supplierId || !overallRating || !title || !reviewBody) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const reviewRef = db
      .collection("users")
      .doc(uid)
      .collection("supplierReviews")
      .doc();

    const review = {
      id: reviewRef.id,
      supplierId,
      userId: uid,
      userName: "You",
      overallRating,
      breakdown: breakdown || { productQuality: 0, shippingSpeed: 0, communication: 0, pricing: 0, reliability: 0 },
      title,
      body: reviewBody,
      photos: photos || [],
      orderVolume: orderVolume || 0,
      timeWorkingWithSupplier: timeWorkingWithSupplier || "",
      verified: false,
      helpful: 0,
    };

    await reviewRef.set(review);

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
