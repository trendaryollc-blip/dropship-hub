import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

vi.mock("next/link", () => ({
  default: (props: any) => <a {...props}>{props.children}</a>,
}));

describe("Footer", () => {
  it("renders brand name", () => {
    render(<Footer />);
    expect(screen.getAllByText(/DropShip/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders category headings", () => {
    render(<Footer />);
    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("renders product links", () => {
    render(<Footer />);
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("How It Works")).toBeInTheDocument();
  });

  it("renders tool links", () => {
    render(<Footer />);
    expect(screen.getByText("Product Search")).toBeInTheDocument();
    expect(screen.getByText("Supplier Finder")).toBeInTheDocument();
  });

  it("renders account links", () => {
    render(<Footer />);
    expect(screen.getAllByText("Sign In").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });

  it("renders copyright", () => {
    render(<Footer />);
    expect(screen.getByText(/DropShip Hub/)).toBeInTheDocument();
  });

  it("renders bottom links", () => {
    render(<Footer />);
    const signInLinks = screen.getAllByText("Sign In");
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });
});
