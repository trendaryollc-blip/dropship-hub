import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { getStoreAdapter } from "@/lib/fulfillment/store-adapters";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("storeConnections").get();
    const connections = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name as string,
        platform: data.platform as string,
        url: data.url as string | undefined,
        backendUrl: data.backendUrl as string | undefined,
        apiKey: data.apiKey as string | undefined,
        apiSecret: data.apiSecret as string | undefined,
        accessToken: data.accessToken as string | undefined,
      };
    });

    const healthResults = await Promise.all(
      connections.map(async (conn) => {
        const adapter = getStoreAdapter(conn.platform as string);
        if (!adapter) {
          return {
            storeId: conn.id,
            storeName: conn.name,
            platform: conn.platform,
            status: "error" as const,
            message: `Platform "${conn.platform}" not supported`,
            lastChecked: new Date().toISOString(),
          };
        }

        const result = await adapter.healthCheck({
          platform: conn.platform as string,
          url: (conn.url || conn.backendUrl || "") as string,
          apiKey: conn.apiKey as string | undefined,
          apiSecret: conn.apiSecret as string | undefined,
          accessToken: conn.accessToken as string | undefined,
        });

        return {
          storeId: conn.id,
          storeName: conn.name,
          platform: conn.platform,
          status: result.status,
          message: result.message,
          responseTimeMs: result.responseTimeMs,
          lastChecked: new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({ health: healthResults });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check store health", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
