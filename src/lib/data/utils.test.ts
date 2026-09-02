import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleFirestoreError } from "./utils";
import { logger } from "@/lib/logger";

describe("handleFirestoreError", () => {
  beforeEach(() => {
    vi.spyOn(logger, "error").mockImplementation(() => {});
  });

  it("re-throws the error", () => {
    const error = new Error("test error");
    expect(() => handleFirestoreError("test", error)).toThrow("test error");
  });

  it("logs the error", () => {
    const error = new Error("test error");
    try {
      handleFirestoreError("test", error);
    } catch {}
    expect(logger.error).toHaveBeenCalled();
  });
});
