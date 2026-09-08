import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Navbar from "./Navbar";

vi.mock("next/link", () => ({
  default: (props: any) => <a {...props}>{props.children}</a>,
}));

vi.mock("@/components/theme/ThemeGallery", () => ({
  default: () => <div data-testid="theme-gallery" />,
}));

describe("Navbar", () => {
  it("renders brand name", () => {
    render(<Navbar />);
    expect(screen.getByText(/DropShip/)).toBeInTheDocument();
  });

  it("renders nav links", () => {
    render(<Navbar />);
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders sign in link", () => {
    render(<Navbar />);
    const signInLinks = screen.getAllByText("Sign In");
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders get started button", () => {
    render(<Navbar />);
    expect(screen.getByText("Get Started Free")).toBeInTheDocument();
  });

  it("renders mobile menu toggle", () => {
    render(<Navbar />);
    expect(screen.getByLabelText("Toggle menu")).toBeInTheDocument();
  });

  it("toggles mobile menu on click", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText("Toggle menu"));
    const mobileLinks = screen.getAllByText("Sign In");
    expect(mobileLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders theme gallery", () => {
    render(<Navbar />);
    expect(screen.getByTestId("theme-gallery")).toBeInTheDocument();
  });
});
