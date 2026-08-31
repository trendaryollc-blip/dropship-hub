export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export async function safeFetch<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      try {
        body = await res.text();
      } catch {
        body = null;
      }
    }

    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status}: ${res.statusText}`;

    throw new FetchError(message, res.status, res.statusText, body);
  }

  const text = await res.text();
  if (!text) return null as T;

  try {
    const parsed: unknown = JSON.parse(text);
    return parsed as T;
  } catch {
    throw new FetchError(
      `Response is not valid JSON: ${text.slice(0, 200)}`,
      res.status,
      res.statusText,
      text
    );
  }
}
