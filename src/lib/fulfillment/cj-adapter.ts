import jwt from "jsonwebtoken";

const CJ_API_URL = "https://developers.cjdropshipping.com/api2.0/v1";
const CJ_API_KEY = process.env.CJ_API_KEY || "";
const CJ_ACCESS_TOKEN = CJ_API_KEY.startsWith("MCP@") ? CJ_API_KEY : "";

async function getCJAccessToken(): Promise<string> {
  if (CJ_ACCESS_TOKEN) return CJ_ACCESS_TOKEN;
  const res = await fetch(`${CJ_API_URL}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "", password: "", apiKey: CJ_API_KEY }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  return data.data?.accessToken || "";
}

export async function placeCJOrder(params: {
  productId: string;
  quantity: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}): Promise<{ success: boolean; orderId?: string; error?: string; estimatedDelivery?: string }> {
  try {
    const token = await getCJAccessToken();
    const res = await fetch(`${CJ_API_URL}/order/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CJ-Access-Token": token,
      },
      body: JSON.stringify({
        productId: params.productId,
        quantity: params.quantity,
        shippingAddress: {
          name: params.shippingAddress.fullName,
          phone: params.shippingAddress.phone,
          address: params.shippingAddress.street,
          city: params.shippingAddress.city,
          state: params.shippingAddress.state,
          zipCode: params.shippingAddress.zipCode,
          country: params.shippingAddress.country,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (data.result && data.data?.orderNumber) {
      return {
        success: true,
        orderId: data.data.orderNumber,
        estimatedDelivery: data.data.estimatedDelivery,
      };
    }
    return { success: false, error: data.message || "CJ order failed" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "CJ API error" };
  }
}

export async function getCJOrderStatus(orderId: string): Promise<{
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
}> {
  try {
    const token = await getCJAccessToken();
    const res = await fetch(`${CJ_API_URL}/order/trace?orderNumber=${orderId}`, {
      headers: { "CJ-Access-Token": token },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    const order = data.data;
    return {
      status: order?.status || "unknown",
      trackingNumber: order?.trackingNumber || null,
      carrier: order?.logisticsName || null,
    };
  } catch {
    return { status: "unknown", trackingNumber: null, carrier: null };
  }
}
