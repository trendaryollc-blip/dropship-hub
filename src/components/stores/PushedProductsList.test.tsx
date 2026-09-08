import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PushedProductsList from "./PushedProductsList";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("lucide-react", () => ({
  Package: () => <div />,
  ExternalLink: () => <div />,
}));

describe("PushedProductsList", () => {
  it("empty state with link", () => {
    render(<PushedProductsList products={[]} />);
    expect(screen.getByText("No products pushed yet")).toBeDefined();
    const link = screen.getByText("Find Products to Push");
    expect(link.closest("a")).toHaveAttribute("href", "/products");
  });

  it("renders product list", () => {
    render(
      <PushedProductsList
        products={[
          {
            id: "p1",
            storeId: "s1",
            storeName: "My Store",
            productTitle: "Wireless Earbuds",
            productImage: "/img.jpg",
            productPrice: 29.99,
            productUrl: "https://example.com",
            status: "pushed",
            pushedAt: "2025-01-01",
          },
        ]}
      />
    );
    expect(screen.getByText("Wireless Earbuds")).toBeDefined();
    expect(screen.getByText("My Store")).toBeDefined();
  });

  it("shows status badges", () => {
    render(
      <PushedProductsList
        products={[
          {
            id: "p1",
            storeId: "s1",
            storeName: "Store",
            productTitle: "Product",
            productImage: "",
            productPrice: 10,
            productUrl: "",
            status: "live",
            pushedAt: "2025-01-01",
          },
        ]}
      />
    );
    expect(screen.getByText(/LIVE/)).toBeDefined();
  });
});
