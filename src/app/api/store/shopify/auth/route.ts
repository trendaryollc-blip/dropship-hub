import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || "read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,read_fulfillments,write_fulfillments";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  const idToken = req.nextUrl.searchParams.get("idToken");

  if (!shop) {
    return NextResponse.json({ error: "shop parameter is required" }, { status: 400 });
  }

  if (!SHOPIFY_API_KEY) {
    return NextResponse.json({ error: "Shopify API key not configured" }, { status: 503 });
  }

  const normalizedShop = shop.replace(/https?:\/\//, "").replace(/\/+$/, "");

  if (!normalizedShop.endsWith(".myshopify.com") && !normalizedShop.includes(".")) {
    return NextResponse.json({ error: "Invalid shop domain. Must be a .myshopify.com domain." }, { status: 400 });
  }

  const state = crypto.randomUUID();

  const callbackUrl = `${req.nextUrl.origin}/api/store/shopify/callback`;

  const authUrl = new URL(`https://${normalizedShop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", SHOPIFY_API_KEY);
  authUrl.searchParams.set("scope", SHOPIFY_SCOPES);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());

  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  response.cookies.set("shopify_shop", normalizedShop, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  if (idToken) {
    response.cookies.set("shopify_id_token", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
  }

  return response;
}
