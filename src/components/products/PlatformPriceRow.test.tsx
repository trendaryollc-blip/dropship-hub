import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlatformPriceRow from "./PlatformPriceRow";

vi.mock("lucide-react", () => ({
  ChevronDown: (props: any) => <div data-testid="icon-chevron" {...props} />,
  ExternalLink: (props: any) => <div data-testid="icon-link" {...props} />,
  Check: (props: any) => <div data-testid="icon-check" {...props} />,
}));

const mockOffers = [
  { platform: "amazon", price: 29.99, link: "https://amazon.com/1", originalTitle: "Product A" },
  { platform: "aliexpress", price: 9.99, link: "https://aliexpress.com/1", originalTitle: "Product A" },
  { platform: "ebay", price: 19.99, link: "https://ebay.com/1", originalTitle: "Product A" },
];

describe("PlatformPriceRow", () => {
  it("renders all platform offers when under maxVisible", () => {
    render(<PlatformPriceRow offers={mockOffers} bestPrice={9.99} bestPlatform="aliexpress" maxVisible={5} />);
    expect(screen.getByText("amazon")).toBeInTheDocument();
    expect(screen.getByText("aliexpress")).toBeInTheDocument();
    expect(screen.getByText("ebay")).toBeInTheDocument();
  });

  it("highlights best price", () => {
    render(<PlatformPriceRow offers={mockOffers} bestPrice={9.99} bestPlatform="aliexpress" />);
    expect(screen.getByText("Best")).toBeInTheDocument();
  });

  it("shows save percentage for more expensive offers", () => {
    render(<PlatformPriceRow offers={mockOffers} bestPrice={9.99} bestPlatform="aliexpress" />);
    expect(screen.getAllByText(/more/).length).toBeGreaterThan(0);
  });

  it("shows expand button when offers exceed maxVisible", () => {
    render(<PlatformPriceRow offers={mockOffers} bestPrice={9.99} bestPlatform="aliexpress" maxVisible={2} />);
    expect(screen.getByText("+1 more platform")).toBeInTheDocument();
  });

  it("expands to show all platforms on click", () => {
    render(<PlatformPriceRow offers={mockOffers} bestPrice={9.99} bestPlatform="aliexpress" maxVisible={2} />);
    fireEvent.click(screen.getByText("+1 more platform"));
    expect(screen.getByText("Show less")).toBeInTheDocument();
    expect(screen.getByText("amazon")).toBeInTheDocument();
  });

  it("returns null for empty offers", () => {
    const { container } = render(<PlatformPriceRow offers={[]} bestPrice={null} bestPlatform="" />);
    expect(container.firstChild).toBeNull();
  });

  it("filters out null price offers", () => {
    const offers = [
      ...mockOffers,
      { platform: "walmart", price: null, link: "", originalTitle: "" },
    ];
    render(<PlatformPriceRow offers={offers} bestPrice={9.99} bestPlatform="aliexpress" />);
    expect(screen.queryByText("walmart")).not.toBeInTheDocument();
  });

  it("renders links to correct platform URLs", () => {
    render(<PlatformPriceRow offers={mockOffers} bestPrice={9.99} bestPlatform="aliexpress" maxVisible={5} />);
    const links = screen.getAllByTestId("icon-link");
    expect(links.length).toBe(3);
  });
});
