import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { placeCJOrder, getCJOrderStatus } from "@/lib/fulfillment/cj-adapter";
import { getAdminDB } from "@/lib/firebase-admin";

interface SampleOrderRequest {
  productId: string;
  productTitle: string;
  productImage?: string;
  productPrice: number;
  source: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

interface BulkSampleOrderRequest {
  products: SampleOrderRequest[];
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();

    // Handle bulk sample orders
    if (body.products && Array.isArray(body.products)) {
      const { products } = body as BulkSampleOrderRequest;
      if (products.length === 0) {
        return NextResponse.json({ error: "No products provided" }, { status: 400 });
      }
      if (products.length > 10) {
        return NextResponse.json({ error: "Maximum 10 sample orders at once" }, { status: 400 });
      }

      const db = await getAdminDB();
      const results = [];

      for (const product of products) {
        try {
          const orderResult = await placeCJOrder({
            productId: product.productId,
            quantity: 1,
            shippingAddress: product.shippingAddress,
          });

          if (orderResult.success && orderResult.orderId) {
            const orderDoc = {
              uid,
              orderId: orderResult.orderId,
              productId: product.productId,
              productTitle: product.productTitle,
              productImage: product.productImage || "",
              productPrice: product.productPrice,
              source: product.source,
              quantity: 1,
              type: "sample",
              status: "pending",
              shippingAddress: product.shippingAddress,
              createdAt: new Date().toISOString(),
            };

            const ref = await db.collection("users").doc(uid).collection("sampleOrders").add(orderDoc);
            results.push({ id: ref.id, ...orderDoc, success: true });
          } else {
            results.push({
              productId: product.productId,
              success: false,
              error: orderResult.error || "Order failed",
            });
          }
        } catch (error) {
          results.push({
            productId: product.productId,
            success: false,
            error: error instanceof Error ? error.message : "Order failed",
          });
        }
      }

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      return NextResponse.json({
        success: true,
        total: products.length,
        successful: successful.length,
        failed: failed.length,
        results,
      });
    }

    // Handle single sample order
    const { productId, productTitle, productImage, productPrice, source, shippingAddress } = body as SampleOrderRequest;

    if (!productId || !productTitle || !shippingAddress) {
      return NextResponse.json({ error: "productId, productTitle, and shippingAddress are required" }, { status: 400 });
    }

    if (!shippingAddress.fullName || !shippingAddress.street || !shippingAddress.city || !shippingAddress.country) {
      return NextResponse.json({ error: "Incomplete shipping address" }, { status: 400 });
    }

    const orderResult = await placeCJOrder({
      productId,
      quantity: 1,
      shippingAddress,
    });

    if (!orderResult.success) {
      return NextResponse.json({ error: orderResult.error || "Failed to place order" }, { status: 400 });
    }

    const db = await getAdminDB();
    const orderDoc = {
      uid,
      orderId: orderResult.orderId,
      productId,
      productTitle,
      productImage: productImage || "",
      productPrice: productPrice || 0,
      source: source || "cj",
      quantity: 1,
      type: "sample",
      status: "pending",
      shippingAddress,
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection("users").doc(uid).collection("sampleOrders").add(orderDoc);

    return NextResponse.json({
      success: true,
      id: ref.id,
      orderId: orderResult.orderId,
      message: "Sample order placed successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to place sample order" },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    const db = await getAdminDB();

    if (orderId) {
      // Get status of a specific order
      const status = await getCJOrderStatus(orderId);
      return NextResponse.json({ orderId, status });
    }

    // Get all sample orders
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("sampleOrders")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch orders" },
      { status: 500 }
    );
  }
});
