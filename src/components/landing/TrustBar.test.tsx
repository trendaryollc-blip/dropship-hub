import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TrustBar from "./TrustBar";

describe("TrustBar", () => {
  it("renders trust bar", () => {
    render(<TrustBar />);
    expect(screen.getByText(/Integrated With/i)).toBeInTheDocument();
  });
});
