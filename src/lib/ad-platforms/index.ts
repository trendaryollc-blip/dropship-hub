import type { AdPlatformAdapter } from "./base";
import { facebookAdapter } from "./facebook";
import { googleAdapter } from "./google";

export type { AdPlatformAdapter, AdPlatformCampaign, AdPlatformMetrics } from "./base";
export { computeMetrics } from "./base";

export const adapters: Record<string, AdPlatformAdapter> = {
  facebook: facebookAdapter,
  google: googleAdapter,
};

export function getAdapter(platform: "facebook" | "google"): AdPlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) throw new Error(`Unknown platform: ${platform}`);
  return adapter;
}
