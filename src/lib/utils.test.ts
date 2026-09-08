import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("handles empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("deduplicates Tailwind classes", () => {
    const result = cn("p-4", "p-8");
    expect(result).toBe("p-8");
  });

  it("handles conditional classes", () => {
    const result = cn("base", false && "hidden", "extra");
    expect(result).toContain("base");
    expect(result).toContain("extra");
    expect(result).not.toContain("hidden");
  });

  it("handles undefined and null gracefully", () => {
    const result = cn("foo", undefined, null, "bar");
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("merges conflicting Tailwind color classes", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("handles array inputs", () => {
    const result = cn(["foo", "bar"]);
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("handles object inputs", () => {
    const result = cn({ foo: true, bar: false, baz: true });
    expect(result).toContain("foo");
    expect(result).not.toContain("bar");
    expect(result).toContain("baz");
  });
});
