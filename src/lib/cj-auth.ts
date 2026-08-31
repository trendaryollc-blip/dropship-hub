const DEFAULT_CJ_API_KEY = process.env.CJ_API_KEY;

let cachedToken: { token: string; expiresAt: number } | null = null;
let refreshPromise: Promise<string> | null = null;
const TOKEN_BUFFER_MS = 5 * 60 * 1000;

async function fetchToken(apiKey: string): Promise<string> {
  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CJ authentication failed: ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const token = data.data?.accessToken;
  const expiresIn = data.data?.expiresIn || 7200;

  if (!token) throw new Error("CJ returned no access token");

  cachedToken = {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return token;
}

export async function getCJAccessToken(overrideKey?: string): Promise<string> {
  const key = overrideKey || DEFAULT_CJ_API_KEY;
  if (!key) throw new Error("CJ_API_KEY not configured");
  if (key.startsWith("MCP@")) return key;

  if (cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_BUFFER_MS) {
    return cachedToken.token;
  }

  if (!refreshPromise) {
    refreshPromise = fetchToken(key).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}
