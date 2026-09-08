import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PromptCard from "./PromptCard";

describe("PromptCard", () => {
  const defaultProps = {
    title: "Test Title",
    subtitle: "Test Subtitle",
    icon: vi.fn(() => <div data-testid="icon" />),
    gradient: "bg-gradient-to-br from-blue-500/10",
    border: "border-blue-500/20",
    colorClass: "text-blue-400",
    onClick: vi.fn(),
  };

  it("renders title and subtitle", () => {
    render(<PromptCard {...defaultProps} />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Subtitle")).toBeInTheDocument();
  });

  it("renders icon", () => {
    render(<PromptCard {...defaultProps} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<PromptCard {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByText("Test Title").closest("button")!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders liveBadge when provided", () => {
    render(<PromptCard {...defaultProps} liveBadge="Live" />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("does not render liveBadge when not provided", () => {
    render(<PromptCard {...defaultProps} />);
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
  });

  it("disables button when disabled prop is true", () => {
    render(<PromptCard {...defaultProps} disabled />);
    const button = screen.getByText("Test Title").closest("button");
    expect(button).toBeDisabled();
  });
});
