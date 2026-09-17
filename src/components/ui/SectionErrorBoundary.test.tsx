import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionErrorBoundary } from "./SectionErrorBoundary";

function HealthyChild() {
  return <div>Section content</div>;
}

function CrashingChild(): never {
  throw new Error("kaboom");
}

describe("SectionErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders children when no error", () => {
    render(
      <SectionErrorBoundary name="Test Section">
        <HealthyChild />
      </SectionErrorBoundary>
    );
    expect(screen.getByText("Section content")).toBeInTheDocument();
  });

  it("renders an isolated fallback when a child crashes", () => {
    render(
      <SectionErrorBoundary name="Test Section">
        <CrashingChild />
      </SectionErrorBoundary>
    );
    expect(screen.getByText("Test Section couldn't load")).toBeInTheDocument();
    expect(screen.queryByText("Section content")).toBeNull();
  });

  it("offers a retry that re-renders children after data recovers", () => {
    let shouldCrash = true;
    function SometimesCrashingChild(): JSX.Element {
      if (shouldCrash) throw new Error("transient");
      return <div>Recovered</div>;
    }

    render(
      <SectionErrorBoundary name="Test Section">
        <SometimesCrashingChild />
      </SectionErrorBoundary>
    );
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();

    shouldCrash = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText("Recovered")).toBeInTheDocument();
  });
});