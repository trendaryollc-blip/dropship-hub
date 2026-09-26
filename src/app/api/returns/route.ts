import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage, PublicError } from "@/lib/api-errors";
import { ConfigMissingError, QuotaExhaustedError } from "@/lib/api-keys/pool";
import { purchaseReturnLabel } from "@/lib/shipping/label-service";
import { GenerateLabelInputSchema, type LabelAddress } from "@/types/returns";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const limitParam = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);

    const db = await getAdminDB();
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
      .collection("users").doc(uid).collection("returnRequests")
      .orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    const snap = await query.limit(limitParam).get();
    const returns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const settingsSnap = await db
      .collection("users").doc(uid).collection("returnSettings")
      .doc("default")
      .get();
    const returnSettings = settingsSnap.exists ? settingsSnap.data() : null;

    return NextResponse.json({ returns, returnSettings });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch returns", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.RETURNS);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    const db = await getAdminDB();

    if (action === "create") {
      const ref = db.collection("users").doc(uid).collection("returnRequests").doc();
      await ref.set({
        ...data,
        status: "pending",
        returnLabel: null,
        refundAmount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ id: ref.id, success: true });
    }

    if (action === "updateStatus") {
      const { returnId, status: newStatus } = data;
      if (!returnId || !newStatus) {
        return NextResponse.json({ error: "returnId and status required" }, { status: 400 });
      }
      const ref = db.collection("users").doc(uid).collection("returnRequests").doc(returnId);
      const doc = await ref.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Return not found" }, { status: 404 });
      }
      await ref.update({
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    if (action === "generateLabel") {
      const parsed = GenerateLabelInputSchema.safeParse(data);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid generateLabel input", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const { returnId, fromAddress, toAddress, weightOz } = parsed.data;

      const retRef = db.collection("users").doc(uid).collection("returnRequests").doc(returnId);
      const retSnap = await retRef.get();
      if (!retSnap.exists) {
        return NextResponse.json({ error: "Return not found" }, { status: 404 });
      }
      const ret = retSnap.data() as {
        orderNumber?: string;
        customerAddress?: LabelAddress | null;
      };

      const from: LabelAddress | null = fromAddress ?? ret.customerAddress ?? null;
      let to: LabelAddress | null = toAddress ?? null;
      if (!to) {
        const settingsSnap = await db
          .collection("users").doc(uid).collection("returnSettings")
          .doc("default")
          .get();
        to = (settingsSnap.exists ? settingsSnap.data()?.returnAddress : null) ?? null;
      }

      if (!from) {
        return NextResponse.json(
          { error: "The customer's return address is required to buy a label. Fill in the ship-from address and try again.", field: "fromAddress" },
          { status: 400 }
        );
      }
      if (!to) {
        return NextResponse.json(
          { error: "Your return address is required to buy a label. Fill in the ship-to address and try again.", field: "toAddress" },
          { status: 400 }
        );
      }

      try {
        const label = await purchaseReturnLabel({
          fromAddress: from,
          toAddress: to,
          reference: ret.orderNumber || returnId,
          parcel: weightOz ? { weightOz } : undefined,
        });

        await retRef.update({
          returnLabel: {
            trackingNumber: label.trackingNumber,
            carrier: label.carrier,
            returnAddress: label.returnAddress,
            instructions: label.instructions,
            labelUrl: label.labelUrl,
            generatedAt: new Date().toISOString(),
          },
          customerAddress: from,
          status: "label_generated",
          updatedAt: new Date().toISOString(),
        });

        if (toAddress) {
          await db
            .collection("users").doc(uid).collection("returnSettings")
            .doc("default")
            .set({ returnAddress: toAddress }, { merge: true });
        }

        return NextResponse.json({ success: true, label, postagePrice: label.postagePrice });
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
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) {
          return NextResponse.json(
            { error: "EasyPost rejected the API key. Check EASYPOST_API_KEYS in Settings → API Keys." },
            { status: 502 }
          );
        }
        return NextResponse.json(
          { error: "Failed to purchase the return label", details: safeErrorMessage(error, "Unknown") },
          { status: 502 }
        );
      }
    }

    if (action === "detect") {
      const cancelledOrders = await db
        .collection("users").doc(uid).collection("fulfillmentOrders")
        .where("status", "in", ["cancelled", "refunded"])
        .limit(50)
        .get();

      const existingReturns = await db
        .collection("users").doc(uid).collection("returnRequests")
        .get();
      const existingOrderIds = new Set(existingReturns.docs.map((d) => d.data().orderId));

      const candidates = cancelledOrders.docs
        .filter((d) => !existingOrderIds.has(d.id))
        .map((d) => {
          const order = d.data();
          return {
            orderId: d.id,
            orderNumber: order.orderNumber || d.id,
            customerName: order.customerName || "Unknown",
            customerEmail: order.customerEmail || "",
            items: (order.items || []).map((item: Record<string, unknown>) => ({
              productId: (item.productId as string) || "",
              productName: (item.name as string) || "Unknown Product",
              quantity: (item.quantity as number) || 1,
              unitPrice: (item.unitPrice as number) || 0,
              imageUrl: (item.imageUrl as string) || "",
            })),
            supplierId: order.assignedSupplier || "unknown",
            supplierName: order.supplierName || "Unknown Supplier",
            platform: order.platformOrders?.[0]?.platform || "unknown",
            storePlatform: order.storePlatform || "custom",
          };
        });

      return NextResponse.json({ candidates, count: candidates.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process return", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.RETURNS);

export const PATCH = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { returnId, ...updates } = body;
    if (!returnId) {
      return NextResponse.json({ error: "returnId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("returnRequests").doc(returnId);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    await ref.update({ ...updates, updatedAt: new Date().toISOString() });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update return", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.RETURNS);
