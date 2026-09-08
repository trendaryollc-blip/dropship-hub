import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Testimonials from "./Testimonials";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

describe("Testimonials", () => {
  it("renders heading", () => {
    render(<Testimonials />);
    expect(screen.getByText(/Loved by/)).toBeInTheDocument();
  });

  it("renders section label", () => {
    render(<Testimonials />);
    expect(screen.getByText("Testimonials")).toBeInTheDocument();
  });

  it("renders first testimonial author", () => {
    render(<Testimonials />);
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
  });

  it("renders all testimonial authors", () => {
    render(<Testimonials />);
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("Marcus Rodriguez")).toBeInTheDocument();
    expect(screen.getByText("Aisha Patel")).toBeInTheDocument();
    expect(screen.getByText("Jake Thompson")).toBeInTheDocument();
    expect(screen.getByText("Elena Kowalski")).toBeInTheDocument();
    expect(screen.getByText("David Park")).toBeInTheDocument();
  });

  it("renders testimonial roles", () => {
    render(<Testimonials />);
    expect(screen.getByText("Full-time Dropshipper")).toBeInTheDocument();
    expect(screen.getByText("Shopify Store Owner")).toBeInTheDocument();
  });

  it("renders testimonial content", () => {
    render(<Testimonials />);
    expect(screen.getByText(/replaced all of them/)).toBeInTheDocument();
  });
});
