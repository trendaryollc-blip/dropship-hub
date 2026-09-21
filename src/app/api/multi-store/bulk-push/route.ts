import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getBulkPushJobs, addBulkPushJob, updateBulkPushJob } from "@/lib/data/multi-store";
import { pushProductToStore } from "@/lib/store-push";
import { getAdminDB } from "@/lib/firebase-admin";
import { safeErrorMessage } from "@/lib/api-errors";
import type { BulkPushJob, BulkPushResult } from "@/types/multi-store";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const jobs = await getBulkPushJobs(uid);
    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch bulk push jobs", details: safeErrorMessage(error, "Unknown") },
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
      status: "in_progress",
      totalPushed: 0,
      totalFailed: 0,
      results: [],
      createdAt: new Date().toISOString(),
    });

    // ── Execute the push for real, per target store ──────────────────────────
    // Previously this route only recorded a "pending" job that nothing ever
    // processed — the UI reported success while products never reached any
    // store. Now each target store receives a real push through the shared
    // storefront integration and the job is finalized with per-store results.
    const product = {
      productTitle: productTitle as string,
      productImage: (productImage as string) || "",
      productPrice: (productPrice as number) || 0,
      productUrl: (productUrl as string) || "",
      productDescription: (productDescription as string) || "",
    };

    const results: BulkPushResult[] = [];
    const updatedTargets: BulkPushJob["targetStores"] = targetStores.map((t) => ({ ...t }));

    for (let i = 0; i < updatedTargets.length; i++) {
      const target = updatedTargets[i];
      try {
        const result = await pushProductToStore(uid, target.storeId, product);
        if (result.success) {
          target.status = "pushed";
          results.push({ storeId: target.storeId, storeName: target.storeName, success: true, platformProductId: result.platformProductId !== undefined ? String(result.platformProductId) : undefined });
        } else {
          target.status = "failed";
          target.error = result.error || "Push failed";
          results.push({ storeId: target.storeId, storeName: target.storeName, success: false, error: target.error });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Push failed";
        target.status = "failed";
        target.error = message;
        results.push({ storeId: target.storeId, storeName: target.storeName, success: false, error: message });
      }
      // Persist progress after each store so the Recent Jobs list stays live.
      const pushedSoFar = updatedTargets.filter((t) => t.status === "pushed").length;
      const failedSoFar = updatedTargets.filter((t) => t.status === "failed").length;
      if (jobId) {
        await updateBulkPushJob(uid, jobId, {
          targetStores: updatedTargets,
          results,
          totalPushed: pushedSoFar,
          totalFailed: failedSoFar,
          status: pushedSoFar + failedSoFar === updatedTargets.length
            ? failedSoFar === 0 ? "completed" : pushedSoFar > 0 ? "partial" : "failed"
            : "in_progress",
        });
      }
    }

    const totalPushed = updatedTargets.filter((t) => t.status === "pushed").length;
    const totalFailed = updatedTargets.filter((t) => t.status === "failed").length;
    const finalStatus = totalFailed === 0 ? "completed" : totalPushed > 0 ? "partial" : "failed";

    return NextResponse.json({
      success: true,
      jobId,
      status: finalStatus,
      totalPushed,
      totalFailed,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create bulk push job", details: safeErrorMessage(error, "Unknown") },
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
      { error: "Failed to update bulk push job", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.STORE_PUSH);
