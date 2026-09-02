import { describe, it, expect, vi, beforeEach } from "vitest";

vi.unmock("@/lib/logger");

describe("logger", () => {
  let consoleDebugSpy: ReturnType<typeof vi.fn>;
  let consoleInfoSpy: ReturnType<typeof vi.fn>;
  let consoleWarnSpy: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {}) as unknown as ReturnType<typeof vi.fn>;
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {}) as unknown as ReturnType<typeof vi.fn>;
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {}) as unknown as ReturnType<typeof vi.fn>;
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {}) as unknown as ReturnType<typeof vi.fn>;
  });

  it("formatLog produces correct format", async () => {
    const { createLogger } = await import("./logger");
    const log = createLogger();

    log.info("test message");
    expect(consoleInfoSpy).toHaveBeenCalled();
    const output = consoleInfoSpy.mock.calls[0][0] as string;
    expect(output).toContain("[INFO]");
    expect(output).toContain("test message");
  });

  it("createLogger includes default context", async () => {
    const { createLogger } = await import("./logger");
    const log = createLogger({ requestId: "req-1" });

    log.info("with context");
    const output = consoleInfoSpy.mock.calls[0][0] as string;
    expect(output).toContain("req-1");
  });

  it("logger.error calls console.error", async () => {
    const { logger } = await import("./logger");

    logger.error("error occurred");
    expect(consoleErrorSpy).toHaveBeenCalled();
    const output = consoleErrorSpy.mock.calls[0][0] as string;
    expect(output).toContain("[ERROR]");
    expect(output).toContain("error occurred");
  });

  it("logger.warn calls console.warn", async () => {
    const { logger } = await import("./logger");

    logger.warn("warning");
    expect(consoleWarnSpy).toHaveBeenCalled();
    const output = consoleWarnSpy.mock.calls[0][0] as string;
    expect(output).toContain("[WARN]");
  });

  it("silentCatch does not throw", async () => {
    const { silentCatch } = await import("./logger");

    expect(() => silentCatch("test-context", new Error("test"))).not.toThrow();
  });

  it("silentCatch logs in development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const { silentCatch } = await import("./logger");
    silentCatch("ctx", new Error("fail"));

    expect(consoleWarnSpy).toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it("silentCatch does not log in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { silentCatch } = await import("./logger");
    silentCatch("ctx", new Error("fail"));

    expect(consoleWarnSpy).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it("logger.debug only logs in development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    vi.resetModules();
    const { logger } = await import("./logger");
    logger.debug("debug msg");
    expect(consoleDebugSpy).toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it("context parameter overrides are merged", async () => {
    const { createLogger } = await import("./logger");
    const log = createLogger({ requestId: "req-1" });

    log.info("msg", { uid: "user-1" });
    const output = consoleInfoSpy.mock.calls[0][0] as string;
    expect(output).toContain("req-1");
    expect(output).toContain("user-1");
  });
});
