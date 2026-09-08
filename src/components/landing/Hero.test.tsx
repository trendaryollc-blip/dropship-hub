import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Hero from "./Hero";

vi.mock("next/link", () => ({
  default: (props: any) => <a {...props}>{props.children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

vi.mock("./ParticleField", () => ({
  default: () => <canvas />,
}));

vi.mock("./TypeWriter", () => ({
  default: ({ words }: { words: string[] }) => <span>{words[0]}</span>,
}));

describe("Hero", () => {
  it("renders main heading", () => {
    render(<Hero />);
    expect(screen.getByText(/Your AI-Powered/)).toBeInTheDocument();
  });

  it("renders subheading", () => {
    render(<Hero />);
    expect(screen.getByText(/One dashboard with AI daily picks/)).toBeInTheDocument();
  });

  it("renders CTA button", () => {
    render(<Hero />);
    expect(screen.getByText("Start For Free")).toBeInTheDocument();
  });

  it("renders how it works link", () => {
    render(<Hero />);
    expect(screen.getByText("See How It Works")).toBeInTheDocument();
  });

  it("renders trending products section", () => {
    render(<Hero />);
    expect(screen.getByText("Trending Products")).toBeInTheDocument();
  });

  it("renders niche radar section", () => {
    render(<Hero />);
    expect(screen.getAllByText("Niche Radar").length).toBeGreaterThanOrEqual(1);
  });

  it("renders trending product names", () => {
    render(<Hero />);
    expect(screen.getByText("Pet GPS Tracker Mini")).toBeInTheDocument();
    expect(screen.getByText("Smart LED Strip 5m")).toBeInTheDocument();
    expect(screen.getByText("Portable Espresso Maker")).toBeInTheDocument();
  });

  it("renders niche names", () => {
    render(<Hero />);
    expect(screen.getByText("Pet Tech")).toBeInTheDocument();
    expect(screen.getByText("Home Office")).toBeInTheDocument();
    expect(screen.getByText("Outdoor Gear")).toBeInTheDocument();
  });

  it("renders feature cards", () => {
    render(<Hero />);
    expect(screen.getByText("AI Daily Pick")).toBeInTheDocument();
    expect(screen.getByText("Live Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Smart Calculator")).toBeInTheDocument();
    expect(screen.getAllByText("Niche Radar").length).toBeGreaterThanOrEqual(1);
  });

  it("renders dashboard URL bar", () => {
    render(<Hero />);
    expect(screen.getByText("dropshiphub.com/dashboard")).toBeInTheDocument();
  });

  it("renders AI monitoring badge", () => {
    render(<Hero />);
    expect(screen.getByText("AI is monitoring")).toBeInTheDocument();
  });
});
