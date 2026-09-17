export const STALE_SYNC_THRESHOLD_DAYS = 7;
export const INVENTORY_DISPLAY_LIMIT = 10;
export const BULK_JOBS_DISPLAY_LIMIT = 10;
export const ORDER_PAGE_SIZE = 20;
export const PRODUCT_PAGE_SIZE = 20;
export const HEALTH_CHECK_WARNING_DAYS = 7;
export const DEBOUNCE_DELAY_MS = 300;
export const SWR_REFRESH_INTERVALS = {
  default: 30_000,
  connections: 30_000,
  orders: 15_000,
  inventory: 60_000,
  performance: 300_000,
} as const;
