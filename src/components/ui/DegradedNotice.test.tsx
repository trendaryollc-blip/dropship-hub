import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DegradedNotice from "./DegradedNotice";

describe("DegradedNotice", () => {
  it("renders failed platform names", () => {
    render(<DegradedNotice failedPlatforms={["Temu", "Shein"]} />);
    expect(screen.getByText(/Temu, Shein/)).toBeInTheDocument();
    expect(screen.getByText("Partial results.")).toBeInTheDocument();
  });

  it("includes succeeded count when provided", () => {
    render(
      <DegradedNotice failedPlatforms={["Temu"]} succeededCount={10} />
    );
    expect(screen.getByText(/10 platforms responded/)).toBeInTheDocument();
  });

  it("renders nothing when there are no failures", () => {
    const { container } = render(<DegradedNotice failedPlatforms={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("states that missing platforms show no data rather than estimates", () => {
    render(<DegradedNotice failedPlatforms={["Temu"]} />);
    expect(
      screen.getByText(/show\s+no data rather than estimates/)
    ).toBeInTheDocument();
  });
});
