import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SectionHeader from "./SectionHeader";

describe("SectionHeader", () => {
  it("renders the title", () => {
    render(<SectionHeader title="My Section" />);
    expect(screen.getByText("My Section")).toBeInTheDocument();
  });

  it("renders optional description", () => {
    render(<SectionHeader title="Section" description="Details here" />);
    expect(screen.getByText("Details here")).toBeInTheDocument();
  });

  it("renders action button with label", () => {
    const onClick = vi.fn();
    render(<SectionHeader title="Section" action={{ label: "View All", onClick }} />);
    expect(screen.getByText("View All")).toBeInTheDocument();
  });

  it("action button calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<SectionHeader title="Section" action={{ label: "Click", onClick }} />);
    screen.getByText("Click").click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders action as link when href is provided", () => {
    render(<SectionHeader title="Section" action={{ label: "Go", href: "/page" }} />);
    const link = screen.getByText("Go");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/page");
  });

  it("applies custom className", () => {
    const { container } = render(<SectionHeader title="Section" className="my-header" />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("my-header");
  });
});
