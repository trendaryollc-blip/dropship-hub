export interface CreativeVariant {
  type: "headline" | "description" | "body" | "cta";
  content: string;
}

const _modelCache = new Map<string, { models: string[]; ts: number }>();
const _MODEL_TTL = 3600000;
const _CHAT_EXCLUDE = /whisper|guard|safeguard|tts|stt|embed|rerank|moderation|prompt/i;

function _sortChatModels(ids: string[]): string[] {
  return ids
    .filter((id) => !_CHAT_EXCLUDE.test(id))
    .sort((a, b) => {
      const aN = parseFloat((a.match(/(\d+(?:\.\d+)?)b/i) || [, "0"])[1]);
      const bN = parseFloat((b.match(/(\d+(?:\.\d+)?)b/i) || [, "0"])[1]);
      return bN - aN;
    });
}

async function _fetchModels(cacheKey: string, url: string, headers: Record<string, string>): Promise<string[]> {
  const hit = _modelCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < _MODEL_TTL) return hit.models;
  try {
    const r = await fetch(url, { headers });
    if (!r.ok) return hit?.models || [];
    const d = await r.json();
    const ids: string[] = (d.data ?? d.models ?? []).map((m: { id: string }) => m.id);
    const sorted = _sortChatModels(ids);
    if (sorted.length) _modelCache.set(cacheKey, { models: sorted, ts: Date.now() });
    return sorted.length ? sorted : (hit?.models || []);
  } catch {
    return hit?.models || [];
  }
}

async function _resolveModel(key: string, url: string, headers: Record<string, string>, fallback: string): Promise<string> {
  const models = await _fetchModels(key, url, headers);
  return models[0] || fallback;
}

async function _resolveGeminiModel(apiKey: string): Promise<string> {
  const cacheKey = `gemini:${apiKey.slice(-8)}`;
  const hit = _modelCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < _MODEL_TTL && hit.models.length) return hit.models[0];

  const probeModels = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-1.5-flash"];
  let lastStatus = 0;
  let lastErrorMsg = "";
  for (const model of probeModels) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] }) });
      if (r.ok) { _modelCache.set(cacheKey, { models: [model], ts: Date.now() }); return model; }
      lastStatus = r.status;
      const body = await r.text().catch(() => "");
      try { const j = JSON.parse(body); lastErrorMsg = j.error?.message || body.slice(0, 200); } catch { lastErrorMsg = body.slice(0, 200); }
    } catch { /* try next */ }
  }
  if (lastStatus === 403) throw new Error("Gemini API access denied. Enable Gemini API at https://aistudio.google.com/apikey");
  if (lastStatus === 400 && lastErrorMsg.includes("location")) throw new Error("Gemini API is not available in your region.");
  throw new Error(`Gemini: No available models found. Last error: ${lastErrorMsg.slice(0, 200)}`);
}

const PLATFORM_INSTRUCTIONS = {
  facebook: {
    headline: "Facebook ad headlines should be punchy, emotional, and under 40 characters. Use power words, numbers, or questions.",
    description: "Facebook ad descriptions should be compelling, benefit-focused, and under 125 characters. Create urgency or curiosity.",
    body: "Facebook ad body text should tell a story, address pain points, and include social proof. Keep under 500 characters.",
    cta: "Facebook CTAs should be action-oriented: Shop Now, Learn More, Get Offer, Sign Up, Book Now.",
  },
  google: {
    headline: "Google Ads headlines must be under 30 characters each. Include target keyword, be specific, and highlight unique value.",
    description: "Google Ads descriptions must be under 90 characters each. Focus on benefits, include a CTA, and use numbers.",
    body: "Google responsive search ad descriptions should be keyword-rich, benefit-focused, and under 90 characters.",
    cta: "Google Ads CTAs should be implicit in the description: Buy Online, Free Shipping, Limited Time Offer.",
  },
};

function buildPrompt(config: {
  platform: "facebook" | "google";
  productTitle: string;
  productDescription?: string;
  targetAudience?: string;
  tone?: string;
  types: string[];
  count: number;
}): string {
  const pi = PLATFORM_INSTRUCTIONS[config.platform];
  const typesList = config.types.map((t) => `- ${t}: ${pi[t as keyof typeof pi]}`).join("\n");

  return `Generate ${config.count} ad creative variants for a ${config.platform} ad campaign.

Product: ${config.productTitle}
${config.productDescription ? `Description: ${config.productDescription}` : ""}
${config.targetAudience ? `Target Audience: ${config.targetAudience}` : ""}
${config.tone ? `Tone: ${config.tone}` : "Tone: professional"}

Platform-specific rules:
${typesList}

Return a JSON array with objects containing "type" and "content" fields. Example:
[
  {"type": "headline", "content": "..."},
  {"type": "description", "content": "..."}
]

Rules:
- Each creative must be unique and compelling
- Follow platform character limits strictly
- Focus on benefits over features
- Include emotional triggers
- Return ONLY valid JSON, no markdown or code fences`;
}

function parseAICreativeResponse(response: string): CreativeVariant[] {
  let cleaned = response.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("AI response is not an array");

  return parsed.map((item: { type?: string; content?: string }) => ({
    type: (item.type || "headline") as CreativeVariant["type"],
    content: item.content || "",
  })).filter((v: CreativeVariant) => v.content.length > 0);
}

interface ProviderConfig {
  id: string;
  envKey: string;
  callAPI: (prompt: string, apiKey: string) => Promise<string>;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const model = await _resolveModel("openai", "https://api.openai.com/v1/models", { Authorization: `Bearer ${apiKey}` }, "gpt-4o-mini");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const model = await _resolveModel("anthropic", "https://api.anthropic.com/v1/models", { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, "claude-sonnet-4-20250514");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const model = await _resolveGeminiModel(apiKey);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    let msg = `Gemini API error (${res.status})`;
    try { const j = JSON.parse(errText); msg = j.error?.message || msg; } catch { /* use default */ }
    throw new Error(msg);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const model = await _resolveModel("groq", "https://api.groq.com/openai/v1/models", { Authorization: `Bearer ${apiKey}` }, "qwen/qwen3.8-27b");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 1000,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callMistral(prompt: string, apiKey: string): Promise<string> {
  const model = await _resolveModel("mistral", "https://api.mistral.ai/v1/models", { Authorization: `Bearer ${apiKey}` }, "mistral-small-latest");
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`Mistral ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callDeepSeek(prompt: string, apiKey: string): Promise<string> {
  const model = await _resolveModel("deepseek", "https://api.deepseek.com/v1/models", { Authorization: `Bearer ${apiKey}` }, "deepseek-chat");
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

const allProviders: ProviderConfig[] = [
  { id: "openai", envKey: "OPENAI_API_KEY", callAPI: callOpenAI },
  { id: "anthropic", envKey: "ANTHROPIC_API_KEY", callAPI: callAnthropic },
  { id: "gemini", envKey: "GOOGLE_AI_API_KEY", callAPI: callGemini },
  { id: "groq", envKey: "GROQ_API_KEY", callAPI: callGroq },
  { id: "mistral", envKey: "MISTRAL_API_KEY", callAPI: callMistral },
  { id: "deepseek", envKey: "DEEPSEEK_API_KEY", callAPI: callDeepSeek },
];

export async function generateCreatives(config: {
  platform: "facebook" | "google";
  productTitle: string;
  productDescription?: string;
  targetAudience?: string;
  tone?: string;
  types: string[];
  count?: number;
  providerPriority?: Array<{ id: string; active: boolean; priority: number }>;
}): Promise<{ creatives: CreativeVariant[]; provider: string }> {
  const count = config.count || 3;
  const prompt = buildPrompt({ ...config, count });

  const orderedProviders = config.providerPriority
    ? config.providerPriority
        .filter((p) => p.active)
        .sort((a, b) => a.priority - b.priority)
        .map((p) => allProviders.find((pr) => pr.id === p.id))
        .filter(Boolean)
    : allProviders;

  let lastError = "";

  for (const provider of orderedProviders) {
    if (!provider) continue;
    const apiKey = process.env[provider.envKey];
    if (!apiKey) {
      lastError = `${provider.id}: No API key`;
      continue;
    }

    try {
      const response = await provider.callAPI(prompt, apiKey);
      const creatives = parseAICreativeResponse(response);
      return { creatives, provider: provider.id };
    } catch (error) {
      lastError = `${provider.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
      continue;
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError}`);
}

export { buildPrompt, parseAICreativeResponse };
