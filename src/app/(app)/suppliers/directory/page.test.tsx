import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SupplierDirectoryPage, { type SupplierDirectoryEntry } from "./page";
import { useAPI } from "@/hooks/useAPI";

vi.mock("@/hooks/useAPI", () => ({ useAPI: vi.fn() }));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockMutate = vi.fn();
const mockUseAPI = vi.mocked(useAPI as unknown as (url: string) => unknown);

function makeEntry(overrides: Partial<SupplierDirectoryEntry> = {}): SupplierDirectoryEntry {
  return {
    id: "sup_1",
    supplierId: "sup_1",
    name: "CJdropshipping",
    platformId: "cjdropshipping",
    storeUrl: "https://cj.example",
    dataSource: "live",
    specializations: ["electronics", "gadgets"],
    listingCount: 1240,
    priceRange: { min: 4.5, max: 12.99, currency: "USD" },
    source: "discovery",
    firstSeenAt: new Date(Date.now() - 86_400_000).toISOString(),
    lastSeenAt: new Date(Date.now() - 3_600_000).toISOString(),
    ...overrides,
  };
}

function mockDirectory(entries: SupplierDirectoryEntry[], extra: Record<string, unknown> = {}) {
  mockUseAPI.mockReturnValue({
    data: { directory: entries },
    error: undefined,
    isLoading: false,
    mutate: mockMutate,
    ...extra,
  } as never);
}

beforeEach(() => {
  mockMutate.mockReset();
  mockUseAPI.mockReset();
});

describe("SupplierDirectoryPage", () => {
  it("renders a row per supplier with source and data badges, listings and price range", () => {
    mockDirectory([
      makeEntry(),
      makeEntry({
        id: "sup_2",
        supplierId: "sup_2",
        name: "AliExpress",
        platformId: "aliexpress",
        listingCount: 3,
        priceRange: { min: 1.99, max: 1.99, currency: "USD" },
        source: "manual-selection",
        dataSource: "estimated",
        storeUrl: null,
        specializations: [],
      }),
    ]);

    render(<SupplierDirectoryPage />);

    const firstRow = screen.getByText("CJdropshipping").closest("tr")!;
    const secondRow = screen.getByText("AliExpress").closest("tr")!;

    expect(screen.getByText("CJdropshipping")).toBeInTheDocument();
    expect(screen.getByText("AliExpress")).toBeInTheDocument();
    expect(within(firstRow).getByText("Discovered")).toBeInTheDocument();
    expect(within(secondRow).getByText("Chosen")).toBeInTheDocument();
    expect(within(firstRow).getByText("live")).toBeInTheDocument();
    expect(within(secondRow).getByText("estimated · unverified")).toBeInTheDocument();
    expect(within(firstRow).getByText("1,240")).toBeInTheDocument();
    expect(within(firstRow).getByText(/\$4\.50/)).toBeInTheDocument();
    expect(within(firstRow).getByText(/\$12\.99/)).toBeInTheDocument();
    expect(within(secondRow).getByText(/\$1\.99/)).toBeInTheDocument();
    expect(within(firstRow).getByTitle("Open supplier store")).toHaveAttribute(
      "href",
      "https://cj.example"
    );
    expect(screen.getByText("Suppliers").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Platforms").parentElement).toHaveTextContent("2");
  });

  it("shows an em dash instead of zero for unmeasured listings, prices and timestamps", () => {
    mockDirectory([
      makeEntry({
        storeUrl: null,
        listingCount: 0,
        priceRange: null,
        lastSeenAt: "not-a-date",
        firstSeenAt: "not-a-date",
      }),
    ]);

    render(<SupplierDirectoryPage />);

    const row = screen.getByText("CJdropshipping").closest("tr")!;

    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/first seen/)).toHaveTextContent("—");
    expect(within(row).queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });

  it("renders the empty state with a CTA when nothing has been discovered or chosen", () => {
    mockDirectory([]);

    render(<SupplierDirectoryPage />);

    expect(screen.getByText("Your directory is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /find suppliers/i })).toHaveAttribute(
      "href",
      "/suppliers?tab=discover"
    );
  });

  it("filters rows by search text", () => {
    mockDirectory([
      makeEntry(),
      makeEntry({ id: "sup_2", supplierId: "sup_2", name: "AliExpress", platformId: "aliexpress" }),
    ]);

    render(<SupplierDirectoryPage />);

    const input = screen.getByLabelText("Search the supplier directory");
    fireEvent.change(input, { target: { value: "ali" } });

    expect(screen.getByText("AliExpress")).toBeInTheDocument();
    expect(screen.queryByText("CJdropshipping")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "nothing-matches" } });
    expect(screen.getByText(/No directory entries match/)).toBeInTheDocument();
  });

  it("filters by source chips", () => {
    mockDirectory([
      makeEntry(),
      makeEntry({ id: "sup_2", supplierId: "sup_2", name: "AliExpress", source: "manual-selection" }),
    ]);

    render(<SupplierDirectoryPage />);

    fireEvent.click(screen.getByRole("button", { name: "Chosen" }));

    expect(screen.getByText("AliExpress")).toBeInTheDocument();
    expect(screen.queryByText("CJdropshipping")).not.toBeInTheDocument();
  });

  it("shows skeletons while the directory is loading", () => {
    mockDirectory([], { data: undefined, isLoading: true });

    render(<SupplierDirectoryPage />);

    expect(screen.getByLabelText("Loading directory")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThan(0);
  });

  it("renders the error state with a retry that refetches", () => {
    mockDirectory([], { data: undefined, error: "permission denied" });

    render(<SupplierDirectoryPage />);

    expect(screen.getByText("Could not load your directory")).toBeInTheDocument();
    expect(screen.getByText("permission denied")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});
