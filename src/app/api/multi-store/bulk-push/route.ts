import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getBulkPushJobs, addBulkPushJob, updateBulkPushJob } from "@/lib/data/multi-store";
import { getAdminDB } from "@/lib/firebase-admin";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const jobs = await getBulkPushJobs(uid);
    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch bulk push jobs", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.STORE_PUSH);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { productTitle, productImage, productPrice, productUrl, productDescription, targetStoreIds } = body;

    if (!productTitle || !targetStoreIds?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getAdminDB();

    // Resolve store connections for the target stores
    const targetStores = [];
    for (const storeId of targetStoreIds) {
      const storeSnap = await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).get();
      if (storeSnap.exists) {
        const store = storeSnap.data()!;
        targetStores.push({
          storeId,
          storeName: store.name || "",
          storePlatform: store.platform || "",
          status: "pending" as const,
        });
      }
    }

    if (targetStores.length === 0) {
      return NextResponse.json({ error: "No valid stores found" }, { status: 400 });
    }

    const jobId = await addBulkPushJob(uid, {
      productTitle,
      productImage: productImage || "",
      productPrice: productPrice || 0,
      productUrl: productUrl || "",
      productDescription: productDescription || "",
      targetStores,
      status: "pending",
      totalPushed: 0,
      totalFailed: 0,
      results: [],
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create bulk push job", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.STORE_PUSH);

export const PUT = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { jobId, ...updates } = body;
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    await updateBulkPushJob(uid, jobId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update bulk push job", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.STORE_PUSH);
