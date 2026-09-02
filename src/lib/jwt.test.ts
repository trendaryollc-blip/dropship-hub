import { describe, it, expect, vi, beforeEach } from "vitest";

describe("jwt", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.TRENDARYO_JWT_SECRET = "test-secret-key";
  });

  it("signTrendaryoToken returns a JWT string", async () => {
    const { signTrendaryoToken } = await import("./jwt");
    const token = signTrendaryoToken({ userId: "123", role: "admin" });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("throws when secret is not set", async () => {
    delete process.env.TRENDARYO_JWT_SECRET;
    vi.resetModules();
    const { signTrendaryoToken } = await import("./jwt");
    expect(() => signTrendaryoToken({ test: true })).toThrow();
  });

  it("accepts custom expiresIn", async () => {
    const { signTrendaryoToken } = await import("./jwt");
    const token = signTrendaryoToken({ userId: "123" }, "2h");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("generates different tokens for different payloads", async () => {
    const { signTrendaryoToken } = await import("./jwt");
    const token1 = signTrendaryoToken({ userId: "111" });
    const token2 = signTrendaryoToken({ userId: "222" });
    expect(token1).not.toBe(token2);
  });

  it("generates valid JWT structure", async () => {
    const { signTrendaryoToken } = await import("./jwt");
    const token = signTrendaryoToken({ userId: "123", role: "user" });
    const parts = token.split(".");
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("accepts empty payload", async () => {
    const { signTrendaryoToken } = await import("./jwt");
    const token = signTrendaryoToken({});
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("accepts various expiresIn formats", async () => {
    const { signTrendaryoToken } = await import("./jwt");
    const token1 = signTrendaryoToken({ userId: "123" }, "1h");
    const token2 = signTrendaryoToken({ userId: "123" }, "7d");
    const token3 = signTrendaryoToken({ userId: "123" }, "30m");
    expect(typeof token1).toBe("string");
    expect(typeof token2).toBe("string");
    expect(typeof token3).toBe("string");
  });

  it("token contains header, payload, and signature", async () => {
    const { signTrendaryoToken } = await import("./jwt");
    const token = signTrendaryoToken({ userId: "123" });
    const [header, payload, signature] = token.split(".");
    expect(header).toBeDefined();
    expect(payload).toBeDefined();
    expect(signature).toBeDefined();
  });
});
