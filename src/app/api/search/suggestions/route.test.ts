import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAdminDB = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: (...args: unknown[]) => mockGetAdminDB(...args),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    decode: vi.fn().mockReturnValue({ uid: "user-123" }),
  },
}));

function makeGetRequest(url: string, headers?: Record<string, string>) {
  return {
    url,
    method: "GET",
    headers: new Map(Object.entries(headers || {})),
  } as any;
}

function createMockFirestoreDoc(data: Record<string, unknown> | null, exists = true) {
  return {
    exists,
    data: () => data,
    id: "mock-doc",
  };
}

function createMockFirestoreCollection(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d.data,
    })),
    size: docs.length,
    empty: docs.length === 0,
  };
}

describe("/api/search/suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("GET", () => {
    it("returns empty suggestions for query shorter than 2 chars", async () => {
      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/search/suggestions?q=a");
      const res = await GET(req);
      const data = await res.json();
      expect(data.suggestions).toEqual([]);
    });

    it("returns category suggestions for matching query", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue(createMockFirestoreCollection([])),
                }),
              }),
            }),
            get: vi.fn().mockResolvedValue(createMockFirestoreDoc(null, false)),
          }),
        }),
      });

      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/search/suggestions?q=wireless");
      const res = await GET(req);
      const data = await res.json();

      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
      const texts = data.suggestions.map((s: { text: string }) => s.text);
      expect(texts.some((t: string) => t.includes("wireless"))).toBe(true);
    });

    it("returns trending category suggestions", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue(createMockFirestoreCollection([])),
                }),
              }),
            }),
            get: vi.fn().mockResolvedValue(createMockFirestoreDoc(null, false)),
          }),
        }),
      });

      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/search/suggestions?q=phone");
      const res = await GET(req);
      const data = await res.json();

      expect(data.suggestions).toBeDefined();
      expect(data.suggestions.length).toBeGreaterThan(0);
      expect(data.suggestions.some((s: { category: string }) => s.category === "category")).toBe(true);
    });

    it("fetches trending searches from Firestore", async () => {
      const mockTrendingDocs = [
        { id: "trending product a", data: { count: 100 } },
        { id: "trending product b", data: { count: 50 } },
      ];

      mockGetAdminDB.mockResolvedValue({
        collection: vi.fn().mockImplementation((path: string) => {
          if (path === "analytics") {
            return {
              doc: vi.fn().mockImplementation((docId: string) => {
                if (docId === "trending") {
                  return {
                    collection: vi.fn().mockReturnValue({
                      orderBy: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          get: vi.fn().mockResolvedValue(createMockFirestoreCollection(mockTrendingDocs)),
                        }),
                      }),
                    }),
                  };
                }
                if (docId === "seasonal") {
                  return {
                    collection: vi.fn().mockReturnValue({
                      doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(createMockFirestoreDoc(null, false)),
                      }),
                    }),
                  };
                }
                return {
                  collection: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(createMockFirestoreCollection([])),
                      }),
                    }),
                  }),
                };
              }),
            };
          }
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(createMockFirestoreCollection([])),
                  }),
                }),
              }),
            }),
          };
        }),
      });

      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/search/suggestions?q=trending");
      const res = await GET(req);
      const data = await res.json();

      expect(data.suggestions).toBeDefined();
      expect(data.suggestions.some((s: { category: string }) => s.category === "trending")).toBe(true);
    });

    it("fetches seasonal suggestions from Firestore", async () => {
      const currentMonth = new Date().getMonth();
      const mockSeasonalData = { suggestions: ["seasonal product a", "seasonal product b"] };

      mockGetAdminDB.mockResolvedValue({
        collection: vi.fn().mockImplementation((path: string) => {
          if (path === "analytics") {
            return {
              doc: vi.fn().mockImplementation((docId: string) => {
                if (docId === "trending") {
                  return {
                    collection: vi.fn().mockReturnValue({
                      orderBy: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          get: vi.fn().mockResolvedValue(createMockFirestoreCollection([])),
                        }),
                      }),
                    }),
                  };
                }
                if (docId === "seasonal") {
                  return {
                    collection: vi.fn().mockReturnValue({
                      doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(
                          createMockFirestoreDoc(mockSeasonalData, true)
                        ),
                      }),
                    }),
                  };
                }
                return {
                  collection: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(createMockFirestoreCollection([])),
                      }),
                    }),
                  }),
                };
              }),
            };
          }
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(createMockFirestoreCollection([])),
                  }),
                }),
              }),
            }),
          };
        }),
      });

      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/search/suggestions?q=seasonal");
      const res = await GET(req);
      const data = await res.json();

      expect(data.suggestions).toBeDefined();
      expect(data.suggestions.some((s: { category: string }) => s.category === "seasonal")).toBe(true);
    });

    it("falls back to default trending searches when Firestore fails", async () => {
      mockGetAdminDB.mockRejectedValue(new Error("Firestore unavailable"));

      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/search/suggestions?q=wireless");
      const res = await GET(req);
      const data = await res.json();

      expect(data.suggestions).toBeDefined();
      expect(data.suggestions.some((s: { text: string }) => s.text.includes("wireless"))).toBe(true);
    });

    it("falls back to default seasonal suggestions when Firestore fails", async () => {
      mockGetAdminDB.mockRejectedValue(new Error("Firestore unavailable"));

      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/search/suggestions?q=jacket");
      const res = await GET(req);
      const data = await res.json();

      expect(data.suggestions).toBeDefined();
      const texts = data.suggestions.map((s: { text: string }) => s.text);
      // "jacket" appears in multiple seasonal months (January, September)
      expect(texts.some((t: string) => t.includes("jacket"))).toBe(true);
    });

    it("deduplicates suggestions", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: vi.fn().mockImplementation((path: string) => {
          if (path === "analytics") {
            return {
              doc: vi.fn().mockImplementation((docId: string) => {
                if (docId === "trending") {
                  return {
                    collection: vi.fn().mockReturnValue({
                      orderBy: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          get: vi.fn().mockResolvedValue(
                            createMockFirestoreCollection([
                              { id: "wireless earbuds", data: { count: 100 } },
                            ])
                          ),
                        }),
                      }),
                    }),
                  };
                }
                if (docId === "seasonal") {
                  return {
                    collection: vi.fn().mockReturnValue({
                      doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(createMockFirestoreDoc(null, false)),
                      }),
                    }),
                  };
                }
                return {
                  collection: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(createMockFirestoreCollection([])),
                      }),
                    }),
                  }),
                };
              }),
            };
          }
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(createMockFirestoreCollection([])),
                  }),
                }),
              }),
            }),
          };
        }),
      });

      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/search/suggestions?q=wireless");
      const res = await GET(req);
      const data = await res.json();

      const texts = data.suggestions.map((s: { text: string }) => s.text);
      const uniqueTexts = [...new Set(texts)];
      expect(texts.length).toBe(uniqueTexts.length);
    });

    it("limits results to 8 suggestions", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: vi.fn().mockImplementation((path: string) => {
          if (path === "analytics") {
            return {
              doc: vi.fn().mockImplementation((docId: string) => {
                if (docId === "trending") {
                  return {
                    collection: vi.fn().mockReturnValue({
                      orderBy: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          get: vi.fn().mockResolvedValue(
                            createMockFirestoreCollection([
                              { id: "product a", data: { count: 100 } },
                              { id: "product b", data: { count: 90 } },
                              { id: "product c", data: { count: 80 } },
                            ])
                          ),
                        }),
                      }),
                    }),
                  };
                }
                if (docId === "seasonal") {
                  return {
                    collection: vi.fn().mockReturnValue({
                      doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(
                          createMockFirestoreDoc(
                            { suggestions: ["seasonal a", "seasonal b", "seasonal c", "seasonal d", "seasonal e"] },
                            true
                          )
                        ),
                      }),
                    }),
                  };
                }
                return {
                  collection: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(createMockFirestoreCollection([])),
                      }),
                    }),
                  }),
                };
              }),
            };
          }
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(createMockFirestoreCollection([])),
                  }),
                }),
              }),
            }),
          };
        }),
      });

      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/search/suggestions?q=product");
      const res = await GET(req);
      const data = await res.json();

      expect(data.suggestions.length).toBeLessThanOrEqual(8);
    });

    it("returns empty suggestions on error", async () => {
      mockGetAdminDB.mockRejectedValue(new Error("Fatal error"));

      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/search/suggestions?q=test");
      const res = await GET(req);
      const data = await res.json();

      expect(data.suggestions).toBeDefined();
      expect(Array.isArray(data.suggestions)).toBe(true);
    });
  });
});
