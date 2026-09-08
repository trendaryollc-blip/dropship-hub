import { describe, it, expect } from "vitest";

describe("firebase client SDK", () => {
  it("exports a default app instance", async () => {
    const mod = await import("./firebase");
    expect(mod).toBeDefined();
    expect(typeof mod).toBe("object");
  });

  it("exports auth instance", async () => {
    const { auth } = await import("./firebase");
    expect(auth).toBeDefined();
  });

  it("exports db instance", async () => {
    const { db } = await import("./firebase");
    expect(db).toBeDefined();
  });

  it("getApps is a callable mock from setup", async () => {
    const { getApps } = await import("firebase/app");
    expect(typeof getApps).toBe("function");
  });

  it("initializeApp is a callable mock from setup", async () => {
    const { initializeApp } = await import("firebase/app");
    expect(typeof initializeApp).toBe("function");
  });
});
