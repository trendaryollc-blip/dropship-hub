import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { PROVIDERS, type ProviderId } from "@/lib/api-keys/providers";
import { getPoolKeys } from "@/lib/api-keys/pool";

/**
 * Reports which platform/data key pools are configured server-side.
 * Returns booleans and counts only — never key material.
 */
export const GET = withAuth(async () => {
  const providers: Record<string, {
    name: string;
    poolEnvVar: string;
    getKeyUrl: string;
    configured: boolean;
    keyCount: number;
  }> = {};

  for (const id of Object.keys(PROVIDERS) as ProviderId[]) {
    const setup = PROVIDERS[id];
    const keys = getPoolKeys(id);
    providers[id] = {
      name: setup.name,
      poolEnvVar: setup.poolEnvVar,
      getKeyUrl: setup.getKeyUrl,
      configured: keys.length > 0,
      keyCount: keys.length,
    };
  }

  return NextResponse.json({ providers });
}, LIMITS.DEFAULT);
