import { vi } from "vitest";
import type { ReactElement } from "react";

export function createMockRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Request {
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (!body && (method === "GET" || method === "DELETE")) {
    delete defaultHeaders["Content-Type"];
  }

  return new Request(`http://localhost${url}`, {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined,
  }) as Request;
}

export function createMockParams(params: Record<string, string>) {
  return params;
}

export function mockFetchSuccess(data: unknown, status = 200) {
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Map([["content-type", "application/json"]]),
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

export function mockFetchError(status: number, message = "Error") {
  const mock = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(message),
    headers: new Map(),
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

export function mockFetchSequence(responses: Array<{ ok: boolean; status: number; data: unknown }>) {
  let callCount = 0;
  const mock = vi.fn().mockImplementation(() => {
    const resp = responses[Math.min(callCount, responses.length - 1)];
    callCount++;
    return Promise.resolve({
      ok: resp.ok,
      status: resp.status,
      json: () => Promise.resolve(resp.data),
      text: () => Promise.resolve(JSON.stringify(resp.data)),
      headers: new Map(),
    });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

export function createMockFirestoreDoc(data: Record<string, unknown> | null = null) {
  return {
    id: "mock-doc-id",
    exists: data !== null,
    data: () => data,
    ref: {
      id: "mock-doc-id",
      path: "mock/path",
      update: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({ exists: data !== null, data: () => data }),
    },
    update: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockFirestoreCollection(docs: Array<Record<string, unknown>> = []) {
  const mockDocs = docs.map((data, i) => ({
    id: `doc-${i}`,
    exists: true,
    data: () => data,
    ref: {
      id: `doc-${i}`,
      path: `mock/collection/doc-${i}`,
      update: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({ exists: true, data: () => data }),
    },
  }));

  return {
    empty: docs.length === 0,
    docs: mockDocs,
    size: docs.length,
    forEach: (cb: (doc: (typeof mockDocs)[0]) => void) => mockDocs.forEach(cb),
  };
}

export function createMockTransaction() {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn().mockImplementation((ref: { id: string }) =>
      Promise.resolve({
        exists: store.has(ref.id),
        data: () => store.get(ref.id),
      })
    ),
    set: vi.fn().mockImplementation((ref: { id: string }, data: unknown) => {
      store.set(ref.id, data);
      return Promise.resolve();
    }),
    update: vi.fn().mockImplementation((ref: { id: string }, data: unknown) => {
      const existing = store.get(ref.id) as Record<string, unknown> | undefined;
      if (existing) store.set(ref.id, { ...existing, ...data });
      return Promise.resolve();
    }),
    delete: vi.fn().mockImplementation((ref: { id: string }) => {
      store.delete(ref.id);
      return Promise.resolve();
    }),
  };
}

export function createMockAdminDB() {
  const docs = new Map<string, { data: Record<string, unknown>; exists: boolean }>();
  const mockDocRef = (path: string) => ({
    id: path.split("/").pop() || "doc-id",
    path,
    get: vi.fn().mockImplementation(() => {
      const entry = docs.get(path);
      return Promise.resolve({
        exists: entry?.exists ?? false,
        data: () => entry?.data ?? null,
      });
    }),
    set: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      docs.set(path, { data, exists: true });
      return Promise.resolve();
    }),
    update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      const entry = docs.get(path);
      if (entry) entry.data = { ...entry.data, ...data };
      return Promise.resolve();
    }),
    delete: vi.fn().mockImplementation(() => {
      docs.delete(path);
      return Promise.resolve();
    }),
  });

  const mockCollection = (collectionPath: string) => ({
    doc: (id?: string) => {
      const docId = id || "auto-id";
      return mockDocRef(`${collectionPath}/${docId}`);
    },
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
    add: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      const id = `auto-${Date.now()}`;
      docs.set(`${collectionPath}/${id}`, { data, exists: true });
      return Promise.resolve({ id });
    }),
  });

  return {
    collection: vi.fn().mockImplementation(mockCollection),
    batch: vi.fn().mockReturnValue({
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
    runTransaction: vi.fn().mockImplementation((fn: (t: ReturnType<typeof createMockTransaction>) => Promise<unknown>) => {
      const transaction = createMockTransaction();
      return fn(transaction);
    }),
    _docs: docs,
  };
}
