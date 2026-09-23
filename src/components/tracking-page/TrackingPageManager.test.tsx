import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();

const mockConfig = {
  id: "store-1", publicId: "pub-123", storeId: "store-1", storeName: "My Store",
  template: "modern", enabled: true,
  branding: {
    logoUrl: "", primaryColor: "#6366f1", secondaryColor: "#818cf8", backgroundColor: "#f8fafc",
    fontFamily: "Inter", businessName: "My Store", supportEmail: "s@s.com", supportUrl: "",
    socialLinks: {},
  },
  upsells: [], notifications: {}, createdAt: "", updatedAt: "",
};

function defaultUseAPIMock(url: string) {
  if (url.includes("type=templates")) {
    return {
      data: {
        templates: [
          { id: "modern", name: "Modern", preview: "", description: "Sleek modern", features: ["Gradient"] },
          { id: "bold", name: "Bold", preview: "", description: "High contrast", features: ["Big type"] },
        ],
      },
      mutate: mockMutate,
      isLoading: false,
      error: undefined,
    };
  }
  if (url.includes("type=list")) {
    return { data: { configs: [mockConfig] }, mutate: mockMutate, isLoading: false, error: undefined };
  }
  if (url.includes("type=stats")) {
    return {
      data: {
        stats: {
          totalViews: 1234, uniqueVisitors: 800, avgDuration: 45, upsellClickRate: 7,
          upsellConversionRate: 2, totalUpsellRevenue: 0, supportTicketReduction: 432,
          topCountries: [], deviceBreakdown: [], recentViews: [],
        },
      },
      mutate: mockMutate,
      isLoading: false,
      error: undefined,
    };
  }
  // /api/store/connections
  return {
    data: { connections: [{ id: "store-1", name: "My Shopify", platform: "shopify" }] },
    mutate: mockMutate,
    isLoading: false,
    error: undefined,
  };
}

const mockUseAPI = vi.fn(defaultUseAPIMock);

vi.mock("@/hooks/useAPI", () => ({ useAPI: (url: string) => mockUseAPI(url) }));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

const mockAuthJson = vi.fn();
vi.mock("@/lib/auth-headers", () => ({ authJson: (...args: unknown[]) => mockAuthJson(...args) }));

vi.mock("@/lib/clipboard", () => ({ copyToClipboard: vi.fn().mockResolvedValue(true) }));

import TrackingPageManager from "./TrackingPageManager";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation(defaultUseAPIMock);
});

describe("TrackingPageManager", () => {
  it("renders header, stats and template cards", () => {
    render(<TrackingPageManager />);
    expect(screen.getByText("Branded Tracking Page")).toBeTruthy();
    expect(screen.getByText("1,234")).toBeTruthy(); // totalViews
    expect(screen.getByText("Modern")).toBeTruthy();
    expect(screen.getByText("Bold")).toBeTruthy();
    expect(screen.getByText("Saved Tracking Pages")).toBeTruthy();
    expect(screen.getByText("My Store")).toBeTruthy();
  });

  it("selects a template on click", () => {
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByText("Bold"));
    const boldBtn = screen.getByText("Bold").closest("button");
    expect(boldBtn?.className).toContain("border-accent/40");
  });

  it("shows validation error when required fields are missing", () => {
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByText("Branding"));
    expect(screen.getByText(/Business name is required/)).toBeTruthy();
  });

  it("disables Save until a store and business name are provided", () => {
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByText("Branding"));
    expect((screen.getByText("Save Tracking Page") as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables Save and posts the config once valid", async () => {
    mockAuthJson.mockResolvedValue({ success: true, id: "store-1", publicId: "pub-xyz" });
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByText("Branding"));
    fireEvent.change(screen.getByLabelText("Business Name *"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByLabelText("Store *"), { target: { value: "store-1" } });
    expect((screen.getByText("Save Tracking Page") as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByText("Save Tracking Page"));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/tracking-page", expect.objectContaining({
        action: "save", storeId: "store-1", template: "modern",
        branding: expect.objectContaining({ businessName: "Acme" }),
        upsells: expect.arrayContaining([
          expect.objectContaining({ position: "header", enabled: false }),
          expect.objectContaining({ position: "footer", enabled: false }),
        ]),
      }));
    });
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("shows inline invalid-color feedback", () => {
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByText("Branding"));
    fireEvent.change(screen.getByLabelText("Business Name *"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByLabelText("Store *"), { target: { value: "store-1" } });
    const colorInput = screen.getByLabelText("Primary Color hex value") as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: "red" } });
    expect(screen.getByText(/Primary color must be a valid hex/)).toBeTruthy();
  });

  it("toggles an upsell slot and reveals its fields", () => {
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByText("Upsells"));
    const toggle = screen.getByRole("switch", { name: "header upsell slot" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByRole("switch", { name: "header upsell slot" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getAllByLabelText("Product Title")[0]).toBeTruthy();
    expect(screen.getAllByLabelText("Product URL")[0]).toBeTruthy();
    expect(screen.getAllByLabelText("Discount %")[0]).toBeTruthy();
    expect(screen.getAllByLabelText("CTA Text")[0]).toBeTruthy();
  });

  it("includes enabled upsell data in the save payload", async () => {
    mockAuthJson.mockResolvedValue({ success: true, id: "store-1", publicId: "pub-xyz" });
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByText("Upsells"));
    fireEvent.click(screen.getByRole("switch", { name: "header upsell slot" }));
    fireEvent.change(screen.getAllByLabelText("Product Title")[0], { target: { value: "Pro Earbuds" } });
    fireEvent.change(screen.getAllByLabelText("Product URL")[0], { target: { value: "https://shop.com/pro" } });
    fireEvent.click(screen.getByText("Branding"));
    fireEvent.change(screen.getByLabelText("Business Name *"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByLabelText("Store *"), { target: { value: "store-1" } });
    fireEvent.click(screen.getByText("Save Tracking Page"));
    await waitFor(() => {
      const payload = mockAuthJson.mock.calls.find((c) => (c[1] as { action?: string })?.action === "save")?.[1] as { upsells: { position: string; enabled: boolean; productTitle: string }[] };
      const headerSlot = payload.upsells.find((u) => u.position === "header");
      expect(headerSlot?.enabled).toBe(true);
      expect(headerSlot?.productTitle).toBe("Pro Earbuds");
    });
  });

  it("copies a real embed code only after saving", async () => {
    mockAuthJson.mockResolvedValue({ success: true, id: "store-1", publicId: "pub-xyz" });
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByText("Branding"));
    const embedBtn = screen.getByText("Copy Embed Code") as HTMLButtonElement;
    expect(embedBtn.disabled).toBe(true); // nothing saved yet
    fireEvent.change(screen.getByLabelText("Business Name *"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByLabelText("Store *"), { target: { value: "store-1" } });
    fireEvent.click(screen.getByText("Save Tracking Page"));
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalled();
    });
    expect((screen.getByText("Copy Embed Code") as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByText("Copy Embed Code"));
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Embed code copied!");
    });
  });

  it("loads a saved config into the editor", () => {
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByRole("button", { name: "Edit this tracking page" }));
    fireEvent.click(screen.getByText("Branding"));
    expect((screen.getByLabelText("Business Name *") as HTMLInputElement).value).toBe("My Store");
    expect((screen.getByLabelText("Store *") as HTMLSelectElement).value).toBe("store-1");
  });

  it("deletes a saved config after confirmation", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByRole("button", { name: "Delete this tracking page" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/tracking-page?id=store-1", undefined, "DELETE");
    });
  });

  it("previews with the selected template and renders a sandboxed iframe", async () => {
    mockAuthJson.mockResolvedValue({ html: "<html><body>Track</body></html>" });
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByText("Branding"));
    fireEvent.click(screen.getByText("Generate Preview"));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/tracking-page", expect.objectContaining({
        action: "preview", template: "modern",
      }));
    });
    const iframe = screen.getByTitle("Tracking Page Preview") as HTMLIFrameElement;
    expect(iframe.getAttribute("sandbox")).toBe("");
  });

  it("shows empty analytics state", () => {
    mockUseAPI.mockImplementation((url: string) => {
      if (url.includes("type=stats")) {
        return {
          data: {
            stats: {
              totalViews: 0, uniqueVisitors: 0, avgDuration: 0, upsellClickRate: 0,
              upsellConversionRate: 0, totalUpsellRevenue: 0, supportTicketReduction: 0,
              topCountries: [], deviceBreakdown: [], recentViews: [],
            },
          },
          mutate: mockMutate, isLoading: false, error: undefined,
        };
      }
      if (url.includes("type=list")) return { data: { configs: [] }, mutate: mockMutate, isLoading: false, error: undefined };
      if (url.includes("type=templates")) {
        return { data: { templates: [] }, mutate: mockMutate, isLoading: false, error: undefined };
      }
      return { data: { connections: [] }, mutate: mockMutate, isLoading: false, error: undefined };
    });
    render(<TrackingPageManager />);
    fireEvent.click(screen.getByText("Analytics"));
    expect(screen.getByText("No tracking page views yet")).toBeTruthy();
  });
});
