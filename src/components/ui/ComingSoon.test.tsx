import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ComingSoon from "./ComingSoon";

describe("ComingSoon", () => {
  it("renders default title and required deliverable", () => {
    render(<ComingSoon whatNeeded="Price history via Keepa API integration" />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(
      screen.getByText("Price history via Keepa API integration")
    ).toBeInTheDocument();
  });

  it("renders custom title and source hint", () => {
    render(
      <ComingSoon
        title="Supplier scorecard — under development"
        whatNeeded="Computed from your own order outcomes"
        howToGet="Add fulfilled orders to activate"
      />
    );
    expect(
      screen.getByText("Supplier scorecard — under development")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add fulfilled orders to activate")
    ).toBeInTheDocument();
  });

  it("has a test id for verification scripts", () => {
    render(<ComingSoon whatNeeded="x" />);
    expect(screen.getByTestId("coming-soon")).toBeInTheDocument();
  });
});
