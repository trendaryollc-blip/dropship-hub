import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "admin@test.com", getIdToken: vi.fn().mockResolvedValue("token") },
  }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(),
}));

import AdminDashboardPage from "./page";
import { safeFetch } from "@/lib/safe-fetch";

describe("Admin Dashboard Page", () => {
  const zeroStats = {
    totalUsers: 0, activeSubscriptions: 0, totalPlatforms: 0,
    healthyPlatforms: 0, totalApiKeys: 0, monthlyRevenue: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    vi.mocked(safeFetch).mockReturnValue(new Promise(() => {}));
    render(<AdminDashboardPage />);
    expect(screen.getByText("Loading dashboard...")).toBeDefined();
  });

  it("renders page header after loading", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ ...zeroStats, totalUsers: 10 });
    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Admin Dashboard")).toBeDefined();
    });
  });

  it("renders Owner Access badge", async () => {
    vi.mocked(safeFetch).mockResolvedValue(zeroStats);
    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Owner Access")).toBeDefined();
    });
  });

  it("renders stat card labels", async () => {
    vi.mocked(safeFetch).mockResolvedValue({
      totalUsers: 42, activeSubscriptions: 15, totalPlatforms: 8,
      healthyPlatforms: 7, totalApiKeys: 24, monthlyRevenue: 1299,
    });
    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Total Users")).toBeDefined();
      expect(screen.getByText("Active Subscriptions")).toBeDefined();
      expect(screen.getByText("Healthy Platforms")).toBeDefined();
      expect(screen.getByText("Monthly Revenue")).toBeDefined();
    });
  });

  it("renders stat card values", async () => {
    vi.mocked(safeFetch).mockResolvedValue({
      totalUsers: 42, activeSubscriptions: 15, totalPlatforms: 8,
      healthyPlatforms: 7, totalApiKeys: 24, monthlyRevenue: 1299,
    });
    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("42")).toBeDefined();
      expect(screen.getByText("15")).toBeDefined();
      expect(screen.getByText("7")).toBeDefined();
      expect(screen.getByText("24")).toBeDefined();
      expect(screen.getByText("$1299")).toBeDefined();
    });
  });

  it("renders zero values when no stats", async () => {
    vi.mocked(safeFetch).mockResolvedValue(null);
    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("$0")).toBeDefined();
    });
  });

  it("renders quick actions section", async () => {
    vi.mocked(safeFetch).mockResolvedValue(zeroStats);
    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Quick Actions")).toBeDefined();
      expect(screen.getByText("Users")).toBeDefined();
      expect(screen.getByText("Analytics")).toBeDefined();
    });
  });

  it("renders quick action links with correct hrefs", async () => {
    vi.mocked(safeFetch).mockResolvedValue(zeroStats);
    render(<AdminDashboardPage />);
    await waitFor(() => {
      const links = document.querySelectorAll('a[href^="/admin/"]');
      const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
      expect(hrefs).toContain("/admin/platforms");
      expect(hrefs).toContain("/admin/api-keys");
      expect(hrefs).toContain("/admin/users");
      expect(hrefs).toContain("/admin/analytics");
    });
  });

  it("renders system status section", async () => {
    vi.mocked(safeFetch).mockResolvedValue({
      ...zeroStats, activeSubscriptions: 3, totalPlatforms: 5,
      healthyPlatforms: 4, totalApiKeys: 10,
    });
    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("System Status")).toBeDefined();
      expect(screen.getByText("Platform Health")).toBeDefined();
      expect(screen.getByText("4/5 healthy")).toBeDefined();
      expect(screen.getByText("API Keys Active")).toBeDefined();
      expect(screen.getByText("10 keys configured")).toBeDefined();
      expect(screen.getByText("Subscriptions")).toBeDefined();
      expect(screen.getByText("3 active paid plans")).toBeDefined();
    });
  });

  it("handles fetch error gracefully", async () => {
    vi.mocked(safeFetch).mockRejectedValue(new Error("Network error"));
    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Admin Dashboard")).toBeDefined();
    });
  });

  it("calls safeFetch with correct auth headers", async () => {
    vi.mocked(safeFetch).mockResolvedValue(zeroStats);
    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(safeFetch).toHaveBeenCalledWith("/api/admin/stats", {
        headers: { Authorization: "Bearer token" },
      });
    });
  });
});
