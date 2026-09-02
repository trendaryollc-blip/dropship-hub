import { describe, it, expect, vi, beforeEach } from "vitest";
import { isUrlSafe } from "./url-allowlist";

vi.mock("dns", () => ({
  promises: {
    lookup: vi.fn((_hostname: string, _opts: unknown, cb: (err: Error | null, addr?: string) => void) => {
      cb(null, "93.184.216.34");
    }) as never,
  },
}));

describe("isUrlSafe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid URL format", async () => {
    const result = await isUrlSafe("not-a-url");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("Invalid URL");
  });

  it("rejects non-http protocols", async () => {
    const result = await isUrlSafe("ftp://example.com/file");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("Protocol");
  });

  it("rejects localhost", async () => {
    const result = await isUrlSafe("http://localhost:3000/api");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("blocked");
  });

  it("rejects 169.254.169.254 (metadata endpoint)", async () => {
    const result = await isUrlSafe("http://169.254.169.254/latest/meta-data");
    expect(result.safe).toBe(false);
  });

  it("rejects 0.0.0.0", async () => {
    const result = await isUrlSafe("http://0.0.0.0:8080");
    expect(result.safe).toBe(false);
  });

  it("rejects .internal hostnames", async () => {
    const result = await isUrlSafe("http://metadata.google.internal/computeMetadata/v1/");
    expect(result.safe).toBe(false);
  });

  it("rejects .local hostnames", async () => {
    const result = await isUrlSafe("http://printer.local/status");
    expect(result.safe).toBe(false);
  });

  it("rejects .localhost hostnames", async () => {
    const result = await isUrlSafe("http://app.localhost:3000");
    expect(result.safe).toBe(false);
  });

  it("allows valid public URLs", async () => {
    const { promises } = await import("dns");
    vi.mocked(promises.lookup).mockImplementation(((_hostname: unknown, _opts: unknown, cb: (err: Error | null, addr?: string) => void) => {
      cb(null, "93.184.216.34");
    }) as never);

    const result = await isUrlSafe("https://example.com/data");
    expect(result.safe).toBe(true);
  });

  it("allows http protocol", async () => {
    const { promises } = await import("dns");
    vi.mocked(promises.lookup).mockImplementation(((_hostname: unknown, _opts: unknown, cb: (err: Error | null, addr?: string) => void) => {
      cb(null, "93.184.216.34");
    }) as never);

    const result = await isUrlSafe("http://example.com");
    expect(result.safe).toBe(true);
  });

  it("rejects blocked IP range 10.x.x.x", async () => {
    const result = await isUrlSafe("http://10.0.0.1/admin");
    expect(result.safe).toBe(false);
  });

  it("rejects blocked IP range 172.16.x.x", async () => {
    const result = await isUrlSafe("http://172.16.0.1/admin");
    expect(result.safe).toBe(false);
  });

  it("rejects blocked IP range 192.168.x.x", async () => {
    const result = await isUrlSafe("http://192.168.1.1/admin");
    expect(result.safe).toBe(false);
  });

  it("rejects 127.x.x.x loopback", async () => {
    const result = await isUrlSafe("http://127.0.0.1:3000");
    expect(result.safe).toBe(false);
  });

  it("rejects data: protocol", async () => {
    const result = await isUrlSafe("data:text/html,<script>alert(1)</script>");
    expect(result.safe).toBe(false);
  });

  it("rejects javascript: protocol", async () => {
    const result = await isUrlSafe("javascript:alert(1)");
    expect(result.safe).toBe(false);
  });

  it("rejects hostname that resolves to blocked IP", async () => {
    const { promises } = await import("dns");
    vi.mocked(promises.lookup).mockImplementation(((_hostname: unknown, _opts: unknown, cb: (err: Error | null, addr?: string) => void) => {
      cb(null, "10.0.0.1");
    }) as never);

    const result = await isUrlSafe("https://internal.example.com");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("10.0.0.1");
  });

  it("rejects when DNS lookup fails", async () => {
    const { promises } = await import("dns");
    vi.mocked(promises.lookup).mockImplementation(((_hostname: unknown, _opts: unknown, cb: (err: Error | null, addr?: string) => void) => {
      cb(new Error("ENOTFOUND"));
    }) as never);

    const result = await isUrlSafe("https://unknown.invalid");
    expect(result.safe).toBe(false);
    expect(result.reason).toContain("Could not resolve");
  });
});
