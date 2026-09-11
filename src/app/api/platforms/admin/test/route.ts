import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isOwner } from "@/lib/auth";
import { markKeyHealthy, markKeyError } from "@/lib/platform-config";

const _CHAT_EXCLUDE = /embed|tts|whisper|dall|vision|audio|realtime|moderation|image/i;

function _sortChatModels(ids: string[]): string[] {
  return ids
    .filter((id) => !_CHAT_EXCLUDE.test(id))
    .sort((a, b) => {
      const aN = parseFloat((a.match(/(\d+(?:\.\d+)?)b/i) || [, "0"])[1]);
      const bN = parseFloat((b.match(/(\d+(?:\.\d+)?)b/i) || [, "0"])[1]);
      return bN - aN;
    });
}

async function _fetchModels(url: string, headers: Record<string, string>): Promise<string[]> {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    const d = await r.json();
    const raw: string[] = Array.isArray(d) ? d.map((m: { id: string }) => m.id) : (d.data ?? d.models ?? []).map((m: { id: string }) => m.id);
    return _sortChatModels(raw);
  } catch {
    return [];
  }
}

async function testPlatformKey(
  method: string,
  key: string,
  platformId: string
): Promise<{ success: boolean; message: string; details?: unknown }> {
  try {
    switch (method) {
      case "official_api": {
        if (platformId === "cj") {
          // Test CJ API
          if (key.startsWith("MCP@")) {
            const res = await fetch(
              `https://developers.cjdropshipping.com/api2.0/v1/product/list?productNameEn=test&pageNum=1&pageSize=1`,
              {
                method: "GET",
                headers: { "CJ-Access-Token": key, "Content-Type": "application/json" },
                signal: AbortSignal.timeout(15000),
              }
            );
            if (!res.ok) return { success: false, message: `CJ API returned ${res.status}` };
            const data = await res.json();
            if (data.code === 200 || data.result) {
              return { success: true, message: "CJ API connection successful" };
            }
            return { success: false, message: data.message || "CJ API returned unexpected response" };
          }
          // Standard CJ auth flow
          const authRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: key }),
            signal: AbortSignal.timeout(10000),
          });
          if (!authRes.ok) return { success: false, message: `CJ Auth failed with ${authRes.status}` };
          const authData = await authRes.json();
          if (authData.data?.accessToken) {
            return { success: true, message: "CJ API key valid, access token obtained" };
          }
          return { success: false, message: authData.message || "CJ auth returned no token" };
        }
        // Generic official API — just try a simple fetch
        return { success: true, message: "API key saved. Testing will occur on first search." };
      }

      case "rainforest": {
        const params = new URLSearchParams({
          api_key: key,
          type: "search",
          amazon_domain: "amazon.com",
          search_term: "test",
          include_clause: "search_results(title)",
        });
        const res = await fetch(`https://api.rainforestapi.com/request?${params}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, message: `Rainforest API ${res.status}: ${body.slice(0, 200)}` };
        }
        return { success: true, message: "Rainforest API connection successful" };
      }

      case "serpapi": {
        const params = new URLSearchParams({
          engine: "google_shopping",
          q: "test",
          api_key: key,
          num: "1",
        });
        const res = await fetch(`https://serpapi.com/search?${params}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, message: `SerpAPI ${res.status}: ${body.slice(0, 200)}` };
        }
        return { success: true, message: "SerpAPI connection successful" };
      }

      case "serper": {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: "test", gl: "us", hl: "en", num: 1 }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, message: `Serper.dev ${res.status}: ${body.slice(0, 200)}` };
        }
        return { success: true, message: "Serper.dev connection successful" };
      }

      case "rapidapi_walmart": {
        const params = new URLSearchParams({ query: "test", page: "1" });
        const res = await fetch(`https://real-time-walmart-data1.p.rapidapi.com/search?${params}`, {
          headers: {
            "X-RapidAPI-Key": key,
            "X-RapidAPI-Host": "real-time-walmart-data1.p.rapidapi.com",
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, message: `Walmart RapidAPI ${res.status}: ${body.slice(0, 200)}` };
        }
        return { success: true, message: "Walmart RapidAPI connection successful" };
      }

      case "scraperapi": {
        const params = new URLSearchParams({
          api_key: key,
          url: "https://httpbin.org/get",
          render: "false",
        });
        const res = await fetch(`https://api.scraperapi.com?${params}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          const body = await res.text();
          return { success: false, message: `ScraperAPI ${res.status}: ${body.slice(0, 200)}` };
        }
        return { success: true, message: "ScraperAPI connection successful" };
      }

      case "custom_scraper": {
        // For custom scrapers, we just validate the key is non-empty
        if (!key || key.trim().length === 0) {
          return { success: false, message: "API key cannot be empty" };
        }
        return { success: true, message: "Custom scraper key saved. Testing will occur on first search." };
      }

      case "ai_provider": {
        // Dynamically resolve an available model, then send a minimal test request
        const providerConfigs: Record<string, {
          modelsUrl: string;
          modelsHeaders: Record<string, string>;
          chatUrl: string;
          chatHeaders: Record<string, string>;
          buildBody: (model: string) => string;
        }> = {
          groq: {
            modelsUrl: "https://api.groq.com/openai/v1/models",
            modelsHeaders: { Authorization: `Bearer ${key}` },
            chatUrl: "https://api.groq.com/openai/v1/chat/completions",
            chatHeaders: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            buildBody: (model) => JSON.stringify({ model, messages: [{ role: "user", content: "Hi" }], max_tokens: 1 }),
          },
          gemini: {
            modelsUrl: "",
            modelsHeaders: {},
            chatUrl: "",
            chatHeaders: {},
            buildBody: () => "",
          },
          openai: {
            modelsUrl: "https://api.openai.com/v1/models",
            modelsHeaders: { Authorization: `Bearer ${key}` },
            chatUrl: "https://api.openai.com/v1/chat/completions",
            chatHeaders: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            buildBody: (model) => JSON.stringify({ model, messages: [{ role: "user", content: "Hi" }], max_tokens: 1 }),
          },
          deepseek: {
            modelsUrl: "https://api.deepseek.com/v1/models",
            modelsHeaders: { Authorization: `Bearer ${key}` },
            chatUrl: "https://api.deepseek.com/v1/chat/completions",
            chatHeaders: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            buildBody: (model) => JSON.stringify({ model, messages: [{ role: "user", content: "Hi" }], max_tokens: 1 }),
          },
          mistral: {
            modelsUrl: "https://api.mistral.ai/v1/models",
            modelsHeaders: { Authorization: `Bearer ${key}` },
            chatUrl: "https://api.mistral.ai/v1/chat/completions",
            chatHeaders: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            buildBody: (model) => JSON.stringify({ model, messages: [{ role: "user", content: "Hi" }], max_tokens: 1 }),
          },
          cohere: {
            modelsUrl: "https://api.cohere.com/v2/models",
            modelsHeaders: { Authorization: `Bearer ${key}` },
            chatUrl: "https://api.cohere.ai/v1/chat",
            chatHeaders: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            buildBody: (model) => JSON.stringify({ model, message: "Hi" }),
          },
          together: {
            modelsUrl: "https://api.together.xyz/v1/models",
            modelsHeaders: { Authorization: `Bearer ${key}` },
            chatUrl: "https://api.together.xyz/v1/chat/completions",
            chatHeaders: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            buildBody: (model) => JSON.stringify({ model, messages: [{ role: "user", content: "Hi" }], max_tokens: 1 }),
          },
          fireworks: {
            modelsUrl: "https://api.fireworks.ai/inference/v1/models",
            modelsHeaders: { Authorization: `Bearer ${key}` },
            chatUrl: "https://api.fireworks.ai/inference/v1/chat/completions",
            chatHeaders: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            buildBody: (model) => JSON.stringify({ model, messages: [{ role: "user", content: "Hi" }], max_tokens: 1 }),
          },
          openrouter: {
            modelsUrl: "https://openrouter.ai/api/v1/models",
            modelsHeaders: { Authorization: `Bearer ${key}` },
            chatUrl: "https://openrouter.ai/api/v1/chat/completions",
            chatHeaders: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            buildBody: (model) => JSON.stringify({ model, messages: [{ role: "user", content: "Hi" }], max_tokens: 1 }),
          },
          huggingface: {
            modelsUrl: "https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&limit=5",
            modelsHeaders: { Authorization: `Bearer ${key}` },
            chatUrl: "",
            chatHeaders: {},
            buildBody: () => "",
          },
        };

        // Special case: Gemini uses probe-based model resolution
        if (platformId === "gemini") {
          const probeModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
          for (const model of probeModels) {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
              { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] }), signal: AbortSignal.timeout(15000) }
            );
            if (res.ok) return { success: true, message: `gemini connection successful (${model})` };
          }
          return { success: false, message: "Gemini: no available models found" };
        }

        // Special case: HuggingFace uses text-generation models
        if (platformId === "huggingface") {
          const models = await _fetchModels("https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&limit=5", { Authorization: `Bearer ${key}` });
          const model = models[0] || "meta-llama/Llama-3-8b-instruct";
          const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: "Hi" }),
            signal: AbortSignal.timeout(15000),
          });
          if (!res.ok) {
            const errBody = await res.text();
            return { success: false, message: `huggingface API ${res.status}: ${errBody.slice(0, 200)}` };
          }
          return { success: true, message: `huggingface connection successful (${model})` };
        }

        const config = providerConfigs[platformId];
        if (!config) {
          return { success: false, message: `No test endpoint configured for provider: ${platformId}` };
        }

        // Fetch available models
        const models = await _fetchModels(config.modelsUrl, config.modelsHeaders);
        const model = models[0];
        if (!model) {
          return { success: false, message: `${platformId}: could not resolve any available models` };
        }

        // Test with resolved model
        const res = await fetch(config.chatUrl, {
          method: "POST",
          headers: config.chatHeaders,
          body: config.buildBody(model),
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          const errBody = await res.text();
          return { success: false, message: `${platformId} API ${res.status}: ${errBody.slice(0, 200)}` };
        }
        return { success: true, message: `${platformId} connection successful (${model})` };
      }

      default:
        return { success: false, message: `Unknown method: ${method}` };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection test failed",
    };
  }
}

// POST — test a platform connection
export async function POST(request: NextRequest) {
  const uid = await verifyAuth(request);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isOwner(uid))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { platformId, keyId, key, method } = await request.json();

    if (!method) {
      return NextResponse.json({ error: "method is required" }, { status: 400 });
    }

    const testKey = key || "";
    const result = await testPlatformKey(method, testKey, platformId || "");

    // Update health status in Firestore if platformId and keyId are provided
    if (platformId && keyId) {
      if (result.success) {
        await markKeyHealthy(platformId, keyId);
      } else {
        await markKeyError(platformId, keyId, result.message);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Test failed" },
      { status: 500 }
    );
  }
}
