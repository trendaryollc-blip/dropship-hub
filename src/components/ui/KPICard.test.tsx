import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DollarSign } from "lucide-react";
import KPICard from "./KPICard";

describe("KPICard", () => {
  it("renders label and value", () => {
    render(<KPICard label="Revenue" value="$1,000" icon={DollarSign} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("$1,000")).toBeInTheDocument();
  });

  it("renders change indicator", () => {
    render(<KPICard label="Revenue" value="$1,000" change="+12%" up={true} icon={DollarSign} />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });

  it("renders with prefix", () => {
    render(<KPICard label="Revenue" value="1,000" prefix="$" icon={DollarSign} />);
    expect(screen.getByText("$1,000")).toBeInTheDocument();
  });
});
