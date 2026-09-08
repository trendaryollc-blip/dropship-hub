import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let ordersQuery = db
      .collection("users")
      .doc(uid)
      .collection("sampleOrders")
      .orderBy("createdAt", "desc")
      .limit(50);

    if (status) {
      ordersQuery = db
        .collection("users")
        .doc(uid)
        .collection("sampleOrders")
        .where("status", "==", status)
        .orderBy("createdAt", "desc")
        .limit(50);
    }

    const ordersSnap = await ordersQuery.get();
    const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ orders });
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

    const { supplierId, supplierName, productName, productImageUrl, samplePrice } = body;
    if (!supplierId || !supplierName || !productName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const orderRef = db
      .collection("users")
      .doc(uid)
      .collection("sampleOrders")
      .doc();

    const order = {
      id: orderRef.id,
      userId: uid,
      supplierId,
      supplierName,
      productName,
      productImageUrl: productImageUrl || "",
      samplePrice: samplePrice || 0,
      status: "requested",
      orderedAt: new Date().toISOString(),
      wouldOrder: false,
    };

    await orderRef.set(order);

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
