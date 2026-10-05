import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "admin@test.com", getIdToken: vi.fn().mockResolvedValue("token") },
  }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(),
}));

import AdminSourcingPage from "./page";
import { safeFetch } from "@/lib/safe-fetch";

const metrics = {
  pipeline: { catalogProducts: 120, supplierAssignments: 45, listingsPushed: 20, ordersReceived: 12 },
  orderRouting: { routed: 9, unassigned: 3, sampled: 12 },
  topSuppliers: [{ name: "CJ Dropshipping", assignments: 10, listings: 8 }],
  recentAssignments: [
    { productId: "p1", supplierName: "CJ Dropshipping", source: "manual", aliased: false, updatedAt: "2026-01-02T00:00:00.000Z" },
  ],
  recentPushes: [
    { productTitle: "Widget", storeName: "Shop A", supplierName: "CJ Dropshipping", platformProductId: "S1", pushedAt: "2026-01-03T00:00:00.000Z" },
  ],
  estimates: { pipeline: false, orderRouting: false, breakdowns: false },
  generatedAt: "2026-01-05T00:00:00.000Z",
};

describe("Admin Sourcing Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state initially", () => {
    vi.mocked(safeFetch).mockReturnValue(new Promise(() => {}));
    render(<AdminSourcingPage />);
    expect(screen.getByText("Loading sourcing operations...")).toBeDefined();
  });

  it("renders the pipeline after loading", async () => {
    vi.mocked(safeFetch).mockResolvedValue(metrics);
    render(<AdminSourcingPage />);
    await waitFor(() => {
      expect(screen.getByText("Sourcing Operations")).toBeDefined();
    });
    expect(screen.getByText("Products cataloged")).toBeDefined();
    expect(screen.getByText("Suppliers selected")).toBeDefined();
    expect(screen.getByText("Listed on store")).toBeDefined();
    expect(screen.getByText("Orders received")).toBeDefined();
    expect(screen.getByText("120")).toBeDefined();
  });

  it("renders top suppliers and recent activity", async () => {
    vi.mocked(safeFetch).mockResolvedValue(metrics);
    render(<AdminSourcingPage />);
    await waitFor(() => expect(screen.getByText("Top suppliers")).toBeDefined());
    expect(screen.getAllByText("CJ Dropshipping").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Widget")).toBeDefined();
  });

  it("shows an error banner when the request fails", async () => {
    vi.mocked(safeFetch).mockRejectedValue(new Error("network"));
    render(<AdminSourcingPage />);
    await waitFor(() => {
      expect(screen.getByText(/Couldn't load sourcing metrics/)).toBeDefined();
    });
  });
});
