import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StoreHealthPanel from "./StoreHealthPanel";
import type { ConnectedStore } from "./ConnectedStoresList";

const { stableUser, safeFetchMock } = vi.hoisted(() => ({
  // Stable identity is required: the panel must not restart its health
  // check on every render just because the mocked user object identity
  // changed (mirrors real Firebase auth object behaviour).
  stableUser: {
    uid: "test-uid",
    email: "test@test.com",
    getIdToken: vi.fn(async () => "test-token"),
  },
  safeFetchMock: vi.fn(),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: stableUser, loading: false }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: safeFetchMock,
}));

const makeConnection = (overrides: Partial<ConnectedStore> = {}): ConnectedStore => ({
  id: "s1",
  platform: "shopify",
  name: "My Store",
  url: "https://store.myshopify.com",
  status: "connected",
  connectedAt: "2024-01-01",
  lastSyncAt: new Date(Date.now() - 86400000).toISOString(),
  productCount: 5,
  ...overrides,
});

const healthEntry = (overrides: Record<string, unknown> = {}) => ({
  storeId: "s1",
  storeName: "My Store",
  platform: "shopify",
  status: "healthy",
  message: "All systems operational",
  lastChecked: new Date().toISOString(),
  ...overrides,
});

describe("StoreHealthPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    safeFetchMock.mockResolvedValue({ health: [] });
  });

  it("shows loading indicator while the health check is in flight", () => {
    safeFetchMock.mockReturnValue(new Promise(() => {}));
    render(<StoreHealthPanel connections={[makeConnection()]} />);
    expect(screen.getByText("Checking store health...")).toBeInTheDocument();
  });

  it("renders health rows returned by the API", async () => {
    safeFetchMock.mockResolvedValue({
      health: [
        healthEntry(),
        healthEntry({
          storeId: "s2",
          storeName: "Other Store",
          status: "degraded",
          message: "Slow responses",
        }),
      ],
    });
    render(
      <StoreHealthPanel
        connections={[
          makeConnection(),
          makeConnection({ id: "s2", name: "Other Store" }),
        ]}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("My Store")).toBeInTheDocument();
    });
    expect(screen.getByText("Other Store")).toBeInTheDocument();
    expect(screen.getByText("All systems operational")).toBeInTheDocument();
    expect(screen.getByText("Slow responses")).toBeInTheDocument();
    expect(screen.getByText("healthy")).toBeInTheDocument();
    expect(screen.getByText("degraded")).toBeInTheDocument();
    expect(screen.getByText(/1 healthy/)).toBeInTheDocument();
  });

  it("shows response time when the API provides it", async () => {
    safeFetchMock.mockResolvedValue({
      health: [healthEntry({ responseTimeMs: 240 })],
    });
    render(<StoreHealthPanel connections={[makeConnection()]} />);
    await waitFor(() => {
      expect(screen.getByText("240ms")).toBeInTheDocument();
    });
  });

  it("renders only the header when the API reports no health entries", async () => {
    safeFetchMock.mockResolvedValue({ health: [] });
    render(<StoreHealthPanel connections={[makeConnection()]} />);
    await waitFor(() => {
      expect(screen.getByText("Store Health")).toBeInTheDocument();
    });
    expect(screen.queryByText("My Store")).not.toBeInTheDocument();
  });

  it("renders the empty state without rows when no stores are connected", async () => {
    render(<StoreHealthPanel connections={[]} />);
    await waitFor(() => {
      expect(screen.getByText("Store Health")).toBeInTheDocument();
    });
    expect(screen.queryByText("My Store")).not.toBeInTheDocument();
    expect(safeFetchMock).not.toHaveBeenCalled();
  });

  it("falls back to connection status when the health check fails", async () => {
    safeFetchMock.mockRejectedValue(new Error("network down"));
    render(
      <StoreHealthPanel connections={[makeConnection({ status: "error" })]} />
    );
    await waitFor(() => {
      expect(screen.getByText("My Store")).toBeInTheDocument();
    });
    expect(screen.getByText("Health check unavailable")).toBeInTheDocument();
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("marks failed checks as unknown for non-error connections", async () => {
    safeFetchMock.mockRejectedValue(new Error("network down"));
    render(<StoreHealthPanel connections={[makeConnection()]} />);
    await waitFor(() => {
      expect(screen.getByText("unknown")).toBeInTheDocument();
    });
  });

  it("sends the auth token with the health check request", async () => {
    render(<StoreHealthPanel connections={[makeConnection()]} />);
    await waitFor(() => {
      expect(safeFetchMock).toHaveBeenCalled();
    });
    expect(stableUser.getIdToken).toHaveBeenCalled();
    expect(safeFetchMock.mock.calls[0][0]).toBe("/api/store/health");
    const init = safeFetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe("Bearer test-token");
  });

  it("re-checks health when the refresh button is clicked", async () => {
    const user = userEvent.setup();
    render(<StoreHealthPanel connections={[makeConnection()]} />);
    await waitFor(() => {
      expect(screen.getByText("Store Health")).toBeInTheDocument();
    });
    expect(safeFetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(safeFetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it("does not re-fetch when re-rendered with the same set of stores (loop regression)", async () => {
    const { rerender } = render(
      <StoreHealthPanel connections={[makeConnection()]} />
    );
    await waitFor(() => {
      expect(safeFetchMock).toHaveBeenCalledTimes(1);
    });
    // New array identity but identical store ids — must NOT retrigger the check.
    rerender(<StoreHealthPanel connections={[makeConnection()]} />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(safeFetchMock).toHaveBeenCalledTimes(1);
  });

  it("re-checks health when a new store is connected", async () => {
    const { rerender } = render(
      <StoreHealthPanel connections={[makeConnection()]} />
    );
    await waitFor(() => {
      expect(safeFetchMock).toHaveBeenCalledTimes(1);
    });
    rerender(
      <StoreHealthPanel
        connections={[
          makeConnection(),
          makeConnection({ id: "s2", name: "Second Store" }),
        ]}
      />
    );
    await waitFor(() => {
      expect(safeFetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

