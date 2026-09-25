import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DataSourceBadge, { type DataSourceKind } from "./DataSourceBadge";

describe("DataSourceBadge", () => {
  const cases: { kind: DataSourceKind; label: string }[] = [
    { kind: "live", label: "Live API" },
    { kind: "firestore", label: "Your data" },
    { kind: "user", label: "Your entry" },
    { kind: "estimated", label: "Estimated" },
  ];

  it.each(cases)("renders $label for source=$kind", ({ kind, label }) => {
    render(<DataSourceBadge source={kind} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("exposes source via data attribute for verification", () => {
    render(<DataSourceBadge source="live" />);
    expect(screen.getByTestId("data-source-badge")).toHaveAttribute(
      "data-source",
      "live"
    );
  });

  it("falls back to Estimated for unknown source", () => {
    render(<DataSourceBadge source={"bogus" as DataSourceKind} />);
    expect(screen.getByText("Estimated")).toBeInTheDocument();
  });
});
