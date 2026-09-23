import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";
import { proxy } from "./proxy";

// setup.ts stubs next/server with a minimal NextResponse (json only).
// Re-mock here so redirect/next exist with a plain get() for assertions.
vi.mock("next/server", () => {
  class FakeNextRequest {}
  return {
    NextRequest: FakeNextRequest,
    NextResponse: {
      redirect(url: URL) {
        const location = url.toString();
        return {
          status: 307,
          headers: {
            get(name: string) {
              return name.toLowerCase() === "location" ? location : null;
            },
          },
          url: location,
        };
      },
      next() {
        return {
          status: 200,
          headers: {
            get() {
              return null;
            },
          },
        };
      },
      json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
        return {
          status: init?.status || 200,
          json: () => Promise.resolve(body),
          headers: new Headers(init?.headers),
        };
      },
    },
  };
});

function req(path: string, cookie?: string) {
  const url = new URL(path, "http://localhost:3000");
  const state = { pathname: url.pathname, search: url.search };

  function makeNextUrl(box: { pathname: string; search: string }) {
    return {
      get pathname() {
        return box.pathname;
      },
      set pathname(value: string) {
        box.pathname = value;
      },
      get search() {
        return box.search;
      },
      set search(value: string) {
        box.search = value;
      },
      toString() {
        return `http://localhost:3000${box.pathname}${box.search}`;
      },
      clone() {
        return makeNextUrl({ pathname: box.pathname, search: box.search });
      },
    };
  }

  return {
    nextUrl: makeNextUrl(state),
    url: url.toString(),
    cookies: {
      get(name: string) {
        if (name === "dh_session" && cookie != null) return { name, value: cookie };
        return undefined;
      },
    },
  } as unknown as NextRequest;
}

function locationOf(res: unknown): string | null {
  if (res == null || typeof res !== "object") return null;
  const r = res as { headers?: { get?: (name: string) => unknown }; url?: unknown };
  const fromHeader = r.headers?.get?.("location");
  if (typeof fromHeader === "string") return fromHeader;
  if (typeof r.url === "string") return r.url;
  return null;
}

describe("proxy", () => {
  it("allows public marketing routes", () => {
    expect(locationOf(proxy(req("/")))).toBeNull();
  });

  it("allows auth routes", () => {
    expect(locationOf(proxy(req("/sign-in")))).toBeNull();
    expect(locationOf(proxy(req("/sign-up")))).toBeNull();
  });

  it("allows API routes", () => {
    expect(locationOf(proxy(req("/api/dashboard")))).toBeNull();
  });

  it("redirects /dashboard to sign-in when no session cookie", () => {
    const loc = locationOf(proxy(req("/dashboard")));
    expect(loc).toContain("/sign-in");
    expect(loc).toContain("callbackUrl=%2Fdashboard");
  });

  it("redirects nested protected paths", () => {
    const loc = locationOf(proxy(req("/products/niches")));
    expect(loc).toContain("/sign-in");
    expect(loc).toContain(encodeURIComponent("/products/niches"));
  });

  it("redirects /admin when no session", () => {
    expect(locationOf(proxy(req("/admin")))).toContain("/sign-in");
  });

  it("allows protected paths with session cookie", () => {
    expect(locationOf(proxy(req("/dashboard", "1")))).toBeNull();
  });

  it("ignores invalid session cookie values", () => {
    expect(locationOf(proxy(req("/dashboard", "nope")))).toContain("/sign-in");
  });
});
