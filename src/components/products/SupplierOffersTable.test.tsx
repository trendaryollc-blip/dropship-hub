import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SupplierOffersTable } from "./SupplierOffersTable";
import type { NormalizedSupplierOffer } from "@/types/supplier-offers";

const mockSafeFetch = vi.fn();
vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: (...args: unknown[]) => mockSafeFetch(...args),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { getIdToken: vi.fn().mockResolvedValue("test-token") } }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, error: null, isLoading: false, mutate: vi.fn() }),
}));

const makeOffer = (overrides: Partial<NormalizedSupplierOffer> = {}): NormalizedSupplierOffer => ({
  supplierId: "sup-1",
  platformId: "alibaba",
  supplierName: "Factory X",
  storeUrl: "https://factory-x.en.alibaba.com/store/123.html",
  productId: "listing-1",
  title: "Green Robot Toy Set",
  image: null,
  url: "https://www.alibaba.com/product-detail/green-robot-toy_123.html",
  unitCost: 4.5,
  currency: "USD",
  shippingCost: 1.2,
  shippingDays: 7,
  rating: 4.6,
  reviews: 320,
  inStock: true,
  stockLevel: null,
  moq: 50,
  dataSource: "live",
  confidence: 0.84,
  matchReasons: ['Title contains "robot toy"', "Image similarity 0.91"],
  ...overrides,
});

describe("SupplierOffersTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeFetch.mockResolvedValue({ ok: true });
  });

  it("renders nothing without offers", () => {
    const { container } = render(
      <SupplierOffersTable productId="prod-1" offers={[]} autoLink={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("surfaces the match confidence next to the reasons that produced it", () => {
    render(<SupplierOffersTable productId="prod-1" offers={[makeOffer()]} autoLink={null} />);
    expect(screen.getByText("0.84 (Estimated)")).toBeInTheDocument();
    expect(
      screen.getByText('Title contains "robot toy", Image similarity 0.91')
    ).toBeInTheDocument();
  });

  it("shows an em dash instead of a confidence of zero", () => {
    render(
      <SupplierOffersTable
        productId="prod-1"
        offers={[makeOffer({ confidence: 0, matchReasons: [] })]}
        autoLink={null}
      />
    );
    expect(screen.queryByText(/Estimated/)).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("explains the auto-match in the banner", () => {
    const offer = makeOffer({ confidence: 0.91 });
    render(
      <SupplierOffersTable
        productId="prod-1"
        offers={[offer]}
        autoLink={{ offer, confidence: 0.91 }}
      />
    );
    expect(screen.getByText(/Auto-matched/)).toBeInTheDocument();
    expect(
      screen.getByText('Title contains "robot toy" · Image similarity 0.91')
    ).toBeInTheDocument();
  });

  it("posts the match reasons and offer provenance when selecting an offer", async () => {
    const onSelect = vi.fn();
    render(
      <SupplierOffersTable productId="prod-1" offers={[makeOffer()]} autoLink={null} onSelect={onSelect} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    await waitFor(() => expect(mockSafeFetch).toHaveBeenCalledTimes(1));
    const [url, init] = mockSafeFetch.mock.calls[0];
    expect(url).toBe("/api/fulfillment/suppliers");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      productId: "prod-1",
      supplierId: "sup-1",
      supplierName: "Factory X",
      confidence: 0.84,
      source: "manual",
      platformId: "alibaba",
      storeUrl: "https://factory-x.en.alibaba.com/store/123.html",
      productUrl: "https://www.alibaba.com/product-detail/green-robot-toy_123.html",
      dataSource: "live",
    });
    expect(body.matchReasons).toEqual([
      'Title contains "robot toy"',
      "Image similarity 0.91",
    ]);
    expect(onSelect).toHaveBeenCalled();
    expect(await screen.findByText("Selected")).toBeInTheDocument();
  });

  it("marks an accepted auto-match so the assignment is auditable", async () => {
    const offer = makeOffer({ confidence: 0.91 });
    render(
      <SupplierOffersTable productId="prod-1" offers={[offer]} autoLink={{ offer, confidence: 0.91 }} />
    );

    fireEvent.click(screen.getByRole("button", { name: /Accept/ }));

    await waitFor(() => expect(mockSafeFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((mockSafeFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.source).toBe("auto_accepted");
    expect(body.confidence).toBe(0.91);
  });
});
