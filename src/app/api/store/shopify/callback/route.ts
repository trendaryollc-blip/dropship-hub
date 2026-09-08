import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDB, getAdminAuth } from "@/lib/firebase-admin";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_CLIENT_SECRET;

function verifyHmac(params: URLSearchParams, secret: string): boolean {
  const hmac = params.get("hmac");
  if (!hmac) return false;

  const paramsForHmac = new URLSearchParams(params);
  paramsForHmac.delete("hmac");
  paramsForHmac.sort();

  const calculated = crypto
    .createHmac("sha256", secret)
    .update(paramsForHmac.toString())
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(hmac));
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const hmac = searchParams.get("hmac");

  const savedState = req.cookies.get("shopify_oauth_state")?.value;
  const savedShop = req.cookies.get("shopify_shop")?.value;
  const idToken = req.cookies.get("shopify_id_token")?.value;

  const baseUrl = req.nextUrl.origin;
  const errorRedirect = `${baseUrl}/store?shopify_error=`;
  const successRedirect = `${baseUrl}/store?shopify_connected=`;

  if (!code || !shop || !state || !hmac) {
    return NextResponse.redirect(`${errorRedirect}missing_parameters`);
  }

  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
    return NextResponse.redirect(`${errorRedirect}shopify_not_configured`);
  }

  if (state !== savedState) {
    return NextResponse.redirect(`${errorRedirect}invalid_state`);
  }

  if (shop !== savedShop) {
    return NextResponse.redirect(`${errorRedirect}shop_mismatch`);
  }

  if (!verifyHmac(searchParams, SHOPIFY_API_SECRET)) {
    return NextResponse.redirect(`${errorRedirect}invalid_hmac`);
  }

  try {
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Shopify token exchange failed:", tokenResponse.status, errText);
      return NextResponse.redirect(`${errorRedirect}token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const grantedScopes = tokenData.scope;

    const shopResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    });

    let shopName = shop.replace(".myshopify.com", "");
    let shopEmail = "";
    if (shopResponse.ok) {
      const shopData = await shopResponse.json();
      shopName = shopData.shop?.name || shopName;
      shopEmail = shopData.shop?.email || "";
    }

    let uid = "";

    if (idToken) {
      try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        uid = decoded.uid;
      } catch {
        // Token invalid or expired
      }
    }

    if (!uid) {
      return NextResponse.redirect(`${errorRedirect}unauthorized`);
    }

    const db = await getAdminDB();
    const connectionData = {
      platform: "shopify",
      name: shopName,
      url: `https://${shop}`,
      storeDomain: shop,
      accessToken,
      apiSecret: SHOPIFY_API_SECRET,
      status: "connected",
      connectedAt: new Date().toISOString(),
      scopes: grantedScopes,
      shopEmail,
    };

    const existing = await db
      .collection("users")
      .doc(uid)
      .collection("storeConnections")
      .where("storeDomain", "==", shop)
      .where("platform", "==", "shopify")
      .limit(1)
      .get();

    if (!existing.empty) {
      await existing.docs[0].ref.update({
        accessToken,
        scopes: grantedScopes,
        status: "connected",
        lastSyncAt: new Date().toISOString(),
      });
    } else {
      await db
        .collection("users")
        .doc(uid)
        .collection("storeConnections")
        .add(connectionData);
    }

    const response = NextResponse.redirect(`${successRedirect}${encodeURIComponent(shopName)}`);

    response.cookies.delete("shopify_oauth_state");
    response.cookies.delete("shopify_shop");
    response.cookies.delete("shopify_id_token");

    return response;
  } catch (error) {
    console.error("Shopify OAuth callback error:", error);
    return NextResponse.redirect(`${errorRedirect}internal_error`);
  }
}
