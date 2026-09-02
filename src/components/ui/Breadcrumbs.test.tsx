import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Breadcrumbs from "./Breadcrumbs";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe("Breadcrumbs", () => {
  it("renders single item", () => {
    render(<Breadcrumbs items={[{ label: "Home" }]} />);
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders multiple items with links", () => {
    render(
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Products", href: "/products" },
        { label: "Detail" },
      ]} />
    );
    expect(screen.getByText("Home")).toHaveAttribute("href", "/");
    expect(screen.getByText("Products")).toHaveAttribute("href", "/products");
    expect(screen.getByText("Detail")).not.toHaveAttribute("href");
  });

  it("has nav element with aria-label", () => {
    render(<Breadcrumbs items={[{ label: "Home" }]} />);
    expect(screen.getByRole("navigation")).toHaveAttribute("aria-label", "Breadcrumb");
  });
});
