import type { CJPollingState, CJPollingOrder } from "@/types/automation";

const pollingStates: Map<string, CJPollingState> = new Map();

const DEFAULT_POLL_INTERVAL = 30 * 60 * 1000;
const DEFAULT_MAX_RETRIES = 10;

export function getPollingState(uid: string): CJPollingState {
  if (!pollingStates.has(uid)) {
    pollingStates.set(uid, {
      userId: uid,
      activeOrders: [],
      lastPollAt: new Date().toISOString(),
      pollIntervalMs: DEFAULT_POLL_INTERVAL,
      maxRetries: DEFAULT_MAX_RETRIES,
    });
  }
  return pollingStates.get(uid)!;
}

export function addOrderToPolling(uid: string, orderId: string, cjOrderNumber: string): CJPollingState {
  const state = getPollingState(uid);
  const exists = state.activeOrders.find((o) => o.orderId === orderId);
  if (!exists) {
    state.activeOrders.push({
      orderId,
      cjOrderNumber,
      retryCount: 0,
      lastCheckedAt: new Date().toISOString(),
      status: "pending",
    });
  }
  pollingStates.set(uid, state);
  return state;
}

export function removeOrderFromPolling(uid: string, orderId: string): CJPollingState {
  const state = getPollingState(uid);
  state.activeOrders = state.activeOrders.filter((o) => o.orderId !== orderId);
  pollingStates.set(uid, state);
  return state;
}

export function updateOrderPollingStatus(
  uid: string,
  orderId: string,
  status: string,
  hasTracking: boolean
): CJPollingState {
  const state = getPollingState(uid);
  const order = state.activeOrders.find((o) => o.orderId === orderId);
  if (order) {
    order.status = status;
    order.retryCount++;
    order.lastCheckedAt = new Date().toISOString();
    if (hasTracking || order.retryCount >= state.maxRetries) {
      state.activeOrders = state.activeOrders.filter((o) => o.orderId !== orderId);
    }
  }
  state.lastPollAt = new Date().toISOString();
  pollingStates.set(uid, state);
  return state;
}

export function getOrdersNeedingPoll(uid: string): CJPollingOrder[] {
  const state = getPollingState(uid);
  const now = Date.now();
  return state.activeOrders.filter((order) => {
    if (order.retryCount === 0) return true;
    const lastCheck = new Date(order.lastCheckedAt).getTime();
    return now - lastCheck >= state.pollIntervalMs;
  });
}

export function setPollingInterval(uid: string, intervalMs: number): void {
  const state = getPollingState(uid);
  state.pollIntervalMs = Math.max(5 * 60 * 1000, Math.min(intervalMs, 24 * 60 * 60 * 1000));
  pollingStates.set(uid, state);
}

export function isOrderBeingPolled(uid: string, orderId: string): boolean {
  const state = getPollingState(uid);
  return state.activeOrders.some((o) => o.orderId === orderId);
}

export function getPollingStats(uid: string): {
  totalActive: number;
  totalRetries: number;
  avgRetries: number;
  oldestOrder: string | null;
  nextPollIn: number;
} {
  const state = getPollingState(uid);
  const totalRetries = state.activeOrders.reduce((sum, o) => sum + o.retryCount, 0);
  const oldest = state.activeOrders.length > 0
    ? state.activeOrders.reduce((oldest, o) =>
        new Date(o.lastCheckedAt).getTime() < new Date(oldest.lastCheckedAt).getTime() ? o : oldest
      )
    : null;

  const now = Date.now();
  const lastPoll = new Date(state.lastPollAt).getTime();
  const nextPollIn = Math.max(0, state.pollIntervalMs - (now - lastPoll));

  return {
    totalActive: state.activeOrders.length,
    totalRetries,
    avgRetries: state.activeOrders.length > 0 ? totalRetries / state.activeOrders.length : 0,
    oldestOrder: oldest?.orderId || null,
    nextPollIn,
  };
}

export function clearPollingState(uid: string): void {
  pollingStates.delete(uid);
}
