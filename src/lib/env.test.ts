import { describe, it, expect, vi, beforeEach } from "vitest";

describe("env", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("getEnv is a function", async () => {
    const { getEnv } = await import("./env");
    expect(typeof getEnv).toBe("function");
  });

  it("getEnv returns an object", async () => {
    const { getEnv } = await import("./env");
    const env = getEnv();
    expect(env).toBeDefined();
    expect(typeof env).toBe("object");
  });
});
