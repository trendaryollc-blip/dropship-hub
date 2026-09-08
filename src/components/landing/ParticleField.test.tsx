import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ParticleField from "./ParticleField";

describe("ParticleField", () => {
  it("renders canvas element", () => {
    const { container } = render(<ParticleField />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("canvas has correct classes", () => {
    const { container } = render(<ParticleField />);
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas.className).toContain("absolute");
    expect(canvas.className).toContain("w-full");
    expect(canvas.className).toContain("h-full");
  });
});
