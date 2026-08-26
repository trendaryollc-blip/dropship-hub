import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");
    if (!uid) return NextResponse.json({ trending: [], alerts: [] });

    // In production, this would fetch real market data from external APIs
    // For now, return contextual mock data
    const trending = [
      { id: "1", name: "Pet GPS Tracker", trend: 340, price: 29.99, margin: 65, platform: "Amazon" },
      { id: "2", name: "Posture Corrector", trend: 180, price: 24.99, margin: 72, platform: "Shopify" },
      { id: "3", name: "LED Strip Lights", trend: 95, price: 19.99, margin: 58, platform: "AliExpress" },
      { id: "4", name: "Portable Espresso", trend: 120, price: 49.99, margin: 45, platform: "Amazon" },
      { id: "5", name: "Smart Water Bottle", trend: 85, price: 34.99, margin: 52, platform: "TikTok" },
    ];

    const alerts = [
      { id: "1", type: "trending", text: "Pet supplies +23% this week", value: "+23%" },
      { id: "2", type: "price", text: "AliExpress shipping costs down", value: "-12%" },
      { id: "3", type: "competition", text: "LED niche saturation rising", value: "High" },
      { id: "4", type: "opportunity", text: "Summer products peaking NOW", value: "Hot" },
    ];

    return NextResponse.json({ trending, alerts });
  } catch {
    return NextResponse.json({ trending: [], alerts: [] });
  }
}
