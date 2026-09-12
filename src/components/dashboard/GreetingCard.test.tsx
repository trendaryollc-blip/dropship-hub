import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GreetingCard from "./GreetingCard";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe("GreetingCard", () => {
  it("renders greeting with username", () => {
    render(<GreetingCard username="John" />);
    expect(screen.getByText(/John/)).toBeInTheDocument();
  });

  it("renders quick action buttons", () => {
    render(<GreetingCard username="John" />);
    expect(screen.getByText("Search Products")).toBeInTheDocument();
    expect(screen.getByText("Find Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Calculate Profit")).toBeInTheDocument();
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("links Search Products to /products", () => {
    render(<GreetingCard username="John" />);
    const link = screen.getByText("Search Products").closest("a");
    expect(link).toHaveAttribute("href", "/products");
  });

  it("links Find Suppliers to /suppliers", () => {
    render(<GreetingCard username="John" />);
    const link = screen.getByText("Find Suppliers").closest("a");
    expect(link).toHaveAttribute("href", "/suppliers");
  });

  it("links Calculate Profit to /calculator", () => {
    render(<GreetingCard username="John" />);
    const link = screen.getByText("Calculate Profit").closest("a");
    expect(link).toHaveAttribute("href", "/calculator");
  });

  it("links AI Assistant to /ai", () => {
    render(<GreetingCard username="John" />);
    const link = screen.getByText("AI Assistant").closest("a");
    expect(link).toHaveAttribute("href", "/ai");
  });

  it("renders different username", () => {
    render(<GreetingCard username="Jane" />);
    expect(screen.getByText(/Jane/)).toBeInTheDocument();
  });

  it("renders all quick action links", () => {
    render(<GreetingCard username="Test" />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(4);
  });
});
