import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Navbar from "./Navbar";

const mockUseAuth = vi.fn();

vi.mock("next/link", () => ({
  default: (props: any) => <a {...props}>{props.children}</a>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/components/theme/ThemeGallery", () => ({
  default: () => <div data-testid="theme-gallery" />,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Navbar", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it("renders brand name", () => {
    render(<Navbar />);
    expect(screen.getByText(/DropShip/)).toBeInTheDocument();
  });

  it("renders public nav links for signed-out users", () => {
    render(<Navbar />);
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("renders Dashboard for signed-in users", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    render(<Navbar />);
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Open Dashboard")).toBeInTheDocument();
  });

  it("renders sign in link when signed out", () => {
    render(<Navbar />);
    const signInLinks = screen.getAllByText("Sign In");
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("hides Sign In and Get Started for signed-in users", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "u1" }, loading: false });
    render(<Navbar />);
    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    expect(screen.queryByText("Get Started Free")).not.toBeInTheDocument();
  });

  it("renders get started button when signed out", () => {
    render(<Navbar />);
    expect(screen.getByText("Get Started Free")).toBeInTheDocument();
  });

  it("hides auth CTAs while session is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<Navbar />);
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    expect(screen.queryByText("Get Started Free")).not.toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();
  });

  it("renders mobile menu toggle", () => {
    render(<Navbar />);
    expect(screen.getByLabelText("Toggle menu")).toBeInTheDocument();
  });

  it("toggles mobile menu on click", () => {
    render(<Navbar />);
    const toggle = screen.getByLabelText("Toggle menu");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // Mobile menu Sign In is now in the document (id=mobile-menu)
    expect(document.getElementById("mobile-menu")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(document.getElementById("mobile-menu")).not.toBeInTheDocument();
  });

  it("closes the mobile menu on Escape", () => {
    render(<Navbar />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    expect(document.getElementById("mobile-menu")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.getElementById("mobile-menu")).not.toBeInTheDocument();
  });

  it("only references mobile-menu via aria-controls when open", () => {
    render(<Navbar />);
    const toggle = screen.getByLabelText("Toggle menu");
    expect(toggle).not.toHaveAttribute("aria-controls");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-controls", "mobile-menu");
  });

  it("renders theme gallery", () => {
    render(<Navbar />);
    expect(screen.getByTestId("theme-gallery")).toBeInTheDocument();
  });
});
