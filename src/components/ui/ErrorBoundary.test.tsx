import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <div />,
  RefreshCw: () => <div />,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

function ThrowingComponent() {
  throw new Error("Test error");
}

function GoodComponent() {
  return <div>All good</div>;
}

describe("ErrorBoundary", () => {
  it("renders children normally", () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("All good")).toBeDefined();
  });

  it("catches errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    spy.mockRestore();
  });

  it("shows fallback UI", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom fallback")).toBeDefined();
    spy.mockRestore();
  });

  it("reset button", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText("Try Again"));
    expect(onReset).toHaveBeenCalled();
    spy.mockRestore();
  });
});
