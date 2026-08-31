import { describe, it, expect } from "vitest";

describe("safe-fetch", () => {
  it("FetchError has correct properties", async () => {
    const { FetchError } = await import("./safe-fetch");
    const err = new FetchError("test", 404, "Not Found", { detail: "x" });
    expect(err.name).toBe("FetchError");
    expect(err.status).toBe(404);
    expect(err.statusText).toBe("Not Found");
    expect(err.body).toEqual({ detail: "x" });
    expect(err.message).toBe("test");
  });
});
