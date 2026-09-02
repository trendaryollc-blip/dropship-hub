import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No results" description="Try a different search" />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try a different search")).toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        description="Nothing here"
        action={{ label: "Add item", onClick }}
      />
    );
    expect(screen.getByText("Add item")).toBeInTheDocument();
  });

  it("renders action link when provided with href", () => {
    render(
      <EmptyState
        title="Empty"
        description="Nothing here"
        action={{ label: "Go home", href: "/" }}
      />
    );
    expect(screen.getByText("Go home")).toHaveAttribute("href", "/");
  });
});
