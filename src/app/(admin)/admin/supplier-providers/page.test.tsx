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

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/components/ui/ConfirmDialog", () => ({
  default: (props: any) => (
    <div data-testid="confirm-dialog">
      {props.open && (
        <div>
          <span>{props.title}</span>
          <button onClick={props.onConfirm}>Confirm</button>
          <button onClick={props.onCancel}>Cancel</button>
        </div>
      )}
    </div>
  ),
}));

import AdminSupplierProvidersPage from "./page";
import { safeFetch } from "@/lib/safe-fetch";

const mockProviders = {
  rainforest: {
    keys: [
      {
        id: "skey-1", key: "rf_abc123def456789", label: "Primary", priority: 1,
        requestsUsed: 200, requestsLimit: 500, resetDate: "2026-10-01",
        lastError: null, lastStatus: "healthy", masked: "••••789",
      },
    ],
    configured: true,
  },
  serpapi: { keys: [], configured: false },
  scraperapi: { keys: [], configured: false },
  serper: { keys: [], configured: false },
  rapidapi: { keys: [], configured: false },
  trendsi: { keys: [], configured: false },
  veridion: { keys: [], configured: false },
  supplierio: { keys: [], configured: false },
  salehoo: { keys: [], configured: false },
  spocket: { keys: [], configured: false },
  dataforseo: { keys: [], configured: false },
  ecomsource: { keys: [], configured: false },
};

describe("Admin Supplier Providers Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    vi.mocked(safeFetch).mockReturnValue(new Promise(() => {}));
    render(<AdminSupplierProvidersPage />);
    expect(screen.getByText("Loading supplier provider keys...")).toBeDefined();
  });

  it("renders page header after loading", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("Supplier Provider Keys")).toBeDefined();
    });
  });

  it("renders stats cards after loading", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("Total Keys")).toBeDefined();
      expect(screen.getByText("Healthy")).toBeDefined();
      expect(screen.getByText("Errors")).toBeDefined();
      expect(screen.getByText("Providers")).toBeDefined();
    });
  });

  it("renders all 12 supplier providers", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("Rainforest API")).toBeDefined();
      expect(screen.getByText("SerpAPI")).toBeDefined();
      expect(screen.getByText("ScraperAPI")).toBeDefined();
      expect(screen.getByText("Serper.dev")).toBeDefined();
      expect(screen.getByText("RapidAPI")).toBeDefined();
      expect(screen.getByText("Trendsi")).toBeDefined();
      expect(screen.getByText("Veridion")).toBeDefined();
      expect(screen.getByText("Supplier.io")).toBeDefined();
      expect(screen.getByText("SaleHoo")).toBeDefined();
      expect(screen.getByText("Spocket")).toBeDefined();
      expect(screen.getByText("DataForSEO")).toBeDefined();
      expect(screen.getByText("EcomSource")).toBeDefined();
    });
  });

  it("displays free tier badges", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("500 credits/mo")).toBeDefined();
      expect(screen.getByText("250 searches/mo")).toBeDefined();
      expect(screen.getByText("1,000 credits")).toBeDefined();
      expect(screen.getByText("2,500 queries/mo")).toBeDefined();
    });
  });

  it("shows key count badge when keys exist", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("1 key")).toBeDefined();
    });
  });

  it("expands provider when Keys button clicked", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("Rainforest API")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Primary")).toBeDefined();
    });
  });

  it("shows empty state when no keys configured", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("SerpAPI")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[1]);

    await waitFor(() => {
      expect(screen.getByText("No API keys configured")).toBeDefined();
    });
  });

  it("shows Add Key form when Add Key button clicked", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("Rainforest API")).toBeDefined();
    });

    const addKeyButtons = screen.getAllByText("Add Key");
    fireEvent.click(addKeyButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Add New API Key")).toBeDefined();
      expect(screen.getByPlaceholderText("Enter API key")).toBeDefined();
    });
  });

  it("shows masked key in key list", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("Rainforest API")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Primary")).toBeDefined();
      expect(screen.getByText("rf_abc12••••••••••••6789")).toBeDefined();
    });
  });

  it("shows health status indicator for healthy keys", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("Rainforest API")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("HEALTHY")).toBeDefined();
    });
  });

  it("shows usage progress bar", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("Rainforest API")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("200/500")).toBeDefined();
    });
  });

  it("renders website links for providers", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      const websiteLinks = screen.getAllByText("Website");
      expect(websiteLinks.length).toBe(12);
    });
  });

  it("calls safeFetch with correct auth headers", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(safeFetch).toHaveBeenCalledWith("/api/admin/supplier-keys", {
        headers: { Authorization: "Bearer token" },
      });
    });
  });

  it("collapse button works correctly", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("Rainforest API")).toBeDefined();
    });

    const keysButtons = screen.getAllByText("Keys");
    fireEvent.click(keysButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Primary")).toBeDefined();
    });

    const collapseButtons = screen.getAllByText("Collapse");
    fireEvent.click(collapseButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("Primary")).toBeNull();
    });
  });

  it("handles empty providers response", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: {} });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("Supplier Provider Keys")).toBeDefined();
    });
  });

  it("renders provider usedFor descriptions", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ providers: mockProviders });
    render(<AdminSupplierProvidersPage />);
    await waitFor(() => {
      expect(screen.getByText("Amazon product data & search")).toBeDefined();
      expect(screen.getByText("Google Shopping & Amazon search")).toBeDefined();
      expect(screen.getByText("Multi-site product scraping")).toBeDefined();
    });
  });
});
