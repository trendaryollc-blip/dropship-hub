import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GreetingCard from "./GreetingCard";

describe("GreetingCard", () => {
  it("renders greeting with username", () => {
    render(<GreetingCard username="John" />);
    expect(screen.getByText(/John/)).toBeInTheDocument();
  });

  it("renders quick action buttons", () => {
    render(<GreetingCard username="John" />);
    expect(screen.getByText("Search Products")).toBeInTheDocument();
    expect(screen.getByText("Find Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Calculate Profit")).toBeInTheDocument();
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });
});
