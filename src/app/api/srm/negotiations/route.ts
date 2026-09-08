import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getNegotiations, addNegotiation, updateNegotiation } from "@/lib/data/srm";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId") || undefined;

    const negotiations = await getNegotiations(uid, supplierId);
    return NextResponse.json({ negotiations });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch negotiations", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "add_round") {
      const { negotiationId, round } = body;
      if (!negotiationId || !round) {
        return NextResponse.json({ error: "Missing negotiationId or round" }, { status: 400 });
      }

      const negotiations = await getNegotiations(uid);
      const negotiation = negotiations.find((n) => n.id === negotiationId);
      if (!negotiation) {
        return NextResponse.json({ error: "Negotiation not found" }, { status: 404 });
      }

      const newRound = {
        roundNumber: negotiation.rounds.length + 1,
        initiator: round.initiator || "us",
        price: round.price,
        message: round.message,
        timestamp: new Date().toISOString(),
      };

      await updateNegotiation(uid, negotiationId, {
        rounds: [...negotiation.rounds, newRound],
        currentOffer: round.price,
        status: "active",
      });

      return NextResponse.json({ success: true });
    }

    if (action === "conclude") {
      const { negotiationId, status, finalPrice } = body;
      if (!negotiationId || !status) {
        return NextResponse.json({ error: "Missing negotiationId or status" }, { status: 400 });
      }

      await updateNegotiation(uid, negotiationId, {
        status,
        finalPrice,
        concludedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    }

    // Create new negotiation
    const { supplierId, supplierName, productTitle, productId, initialPrice, targetPrice, quantity, notes } = body;
    if (!supplierId || !productTitle || !initialPrice || !targetPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const negotiationId = await addNegotiation(uid, {
      supplierId,
      supplierName: supplierName || "",
      productTitle,
      productId,
      status: "active",
      rounds: [{
        roundNumber: 1,
        initiator: "us",
        price: initialPrice,
        message: `Initial offer: $${initialPrice}`,
        timestamp: new Date().toISOString(),
      }],
      initialPrice,
      currentOffer: initialPrice,
      targetPrice,
      quantity: quantity || 1,
      notes: notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: negotiationId });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process negotiation", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const PUT = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { negotiationId, ...updates } = body;
    if (!negotiationId) return NextResponse.json({ error: "negotiationId required" }, { status: 400 });

    await updateNegotiation(uid, negotiationId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update negotiation", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
