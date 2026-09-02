import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageErrorBoundary } from "./PageErrorBoundary";

describe("PageErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <PageErrorBoundary>
        <div>Child content</div>
      </PageErrorBoundary>
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders error fallback when child throws", () => {
    const ErrorChild = () => {
      throw new Error("Test error");
    };
    render(
      <PageErrorBoundary>
        <ErrorChild />
      </PageErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
