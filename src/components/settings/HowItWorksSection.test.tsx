import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HowItWorksSection from "./HowItWorksSection";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe("HowItWorksSection", () => {
  it("renders how it works section", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("How It Works")).toBeDefined();
  });

  it("renders fallback chain info", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/Fallback Chain/)).toBeDefined();
    expect(screen.getByText(/If provider #1 fails/)).toBeDefined();
  });

  it("renders free tiers info", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/Free Tiers/)).toBeDefined();
    expect(screen.getByText(/Start with free tiers/)).toBeDefined();
  });

  it("renders security info", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/Security/)).toBeDefined();
    expect(screen.getByText(/API keys are stored securely/)).toBeDefined();
  });

  it("renders quick start guide", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("Quick Start")).toBeDefined();
  });

  it("renders all quick start steps", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/Get a free API key from Groq/)).toBeDefined();
    expect(screen.getByText(/Paste your key in the Groq provider card/)).toBeDefined();
    expect(screen.getByText(/Click Test to verify/)).toBeDefined();
    expect(screen.getByText(/Search for products with AI-powered insights/)).toBeDefined();
  });

  it("has link to external Groq page", () => {
    render(<HowItWorksSection />);
    const groqLink = screen.getByText("Open").closest("a");
    expect(groqLink?.getAttribute("href")).toBe("https://groq.com");
    expect(groqLink?.getAttribute("target")).toBe("_blank");
  });

  it("has link to internal pages", () => {
    render(<HowItWorksSection />);
    const testItLink = screen.getByText("Test it").closest("a");
    expect(testItLink?.getAttribute("href")).toBe("/ai");

    const goLink = screen.getByText("Go").closest("a");
    expect(goLink?.getAttribute("href")).toBe("/products");
  });

  it("renders step numbers", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
  });

  it("renders the security info about environment variables", () => {
    render(<HowItWorksSection />);
    expect(screen.getByText(/environment variables/)).toBeDefined();
  });
});
