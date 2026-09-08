import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SectionEmpty from "./SectionEmpty";

const MockIcon = (props: any) => <div data-testid="mock-icon" {...props} />;

describe("SectionEmpty", () => {
  it("renders icon", () => {
    render(<SectionEmpty icon={MockIcon} title="No results" />);
    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });

  it("renders title", () => {
    render(<SectionEmpty icon={MockIcon} title="No results found" />);
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<SectionEmpty icon={MockIcon} title="Empty" description="Try a different search" />);
    expect(screen.getByText("Try a different search")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    render(<SectionEmpty icon={MockIcon} title="Empty" />);
    expect(screen.queryByText("Try a different search")).not.toBeInTheDocument();
  });

  it("applies custom iconColor", () => {
    render(<SectionEmpty icon={MockIcon} title="Empty" iconColor="text-red-400" />);
    const icon = screen.getByTestId("mock-icon");
    expect(icon.className).toContain("text-red-400");
  });

  it("applies default iconColor when not specified", () => {
    render(<SectionEmpty icon={MockIcon} title="Empty" />);
    const icon = screen.getByTestId("mock-icon");
    expect(icon.className).toContain("text-muted-foreground/20");
  });
});
