import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CuratedListTab from "./CuratedListTab";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "test@test.com", getIdToken: vi.fn().mockResolvedValue("token") },
  }),
}));

vi.mock("@/lib/platform-catalog", () => ({
  PLATFORM_CATALOG: [
    {
      id: "aliexpress",
      name: "AliExpress",
      method: "scraperapi",
      category: "Dropshipping",
      description: "Global retail marketplace",
      keyHint: "ScraperAPI key",
      keyUrl: "https://scraperapi.com",
    },
    {
      id: "cj",
      name: "CJ Dropshipping",
      method: "official_api",
      category: "Dropshipping",
      description: "Dropshipping supplier with API",
      keyHint: "CJ API key",
      keyUrl: "https://cjdropshipping.com",
    },
  ],
  CATALOG_METHOD_LABELS: { scraperapi: "ScraperAPI", official_api: "Official API", serpapi: "SerpAPI", serper: "Serper", rapidapi_walmart: "RapidAPI", custom_scraper: "Custom" },
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({}),
}));

vi.mock("lucide-react", () => ({
  Loader2: () => <div />,
  Key: () => <div />,
  Globe: () => <div />,
  ExternalLink: () => <div />,
}));

describe("CuratedListTab", () => {
  it("renders platform grid", () => {
    render(<CuratedListTab onCreated={vi.fn()} />);
    expect(screen.getByText("Curated Platforms")).toBeDefined();
    expect(screen.getByText("AliExpress")).toBeDefined();
    expect(screen.getByText("CJ Dropshipping")).toBeDefined();
  });

  it("renders category filters", () => {
    render(<CuratedListTab onCreated={vi.fn()} />);
    expect(screen.getByText("All")).toBeDefined();
    expect(screen.getByText("Dropshipping")).toBeDefined();
    expect(screen.getByText("Marketplace")).toBeDefined();
  });

  it("renders connect button", () => {
    render(<CuratedListTab onCreated={vi.fn()} />);
    const connectBtns = screen.getAllByText("Connect");
    expect(connectBtns.length).toBeGreaterThan(0);
  });
});
