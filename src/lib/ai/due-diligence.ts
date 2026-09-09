import type { SupplierProfile, SupplierDueDiligence } from "@/types/supplier";

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

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const model = await _resolveModel("openai", "https://api.openai.com/v1/models", { Authorization: `Bearer ${apiKey}` }, "gpt-4o-mini");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 2048 }),
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
    body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const probeModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  for (const model of probeModels) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch { /* try next */ }
  }
  throw new Error("Gemini: No available models");
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const model = await _resolveModel("groq", "https://api.groq.com/openai/v1/models", { Authorization: `Bearer ${apiKey}` }, "qwen/qwen3.8-27b");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1000 }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callDeepSeek(prompt: string, apiKey: string): Promise<string> {
  const model = await _resolveModel("deepseek", "https://api.deepseek.com/v1/models", { Authorization: `Bearer ${apiKey}` }, "deepseek-chat");
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

interface ProviderConfig {
  id: string;
  envKey: string;
  callAPI: (prompt: string, apiKey: string) => Promise<string>;
}

const allProviders: ProviderConfig[] = [
  { id: "openai", envKey: "OPENAI_API_KEY", callAPI: callOpenAI },
  { id: "anthropic", envKey: "ANTHROPIC_API_KEY", callAPI: callAnthropic },
  { id: "gemini", envKey: "GOOGLE_AI_API_KEY", callAPI: callGemini },
  { id: "groq", envKey: "GROQ_API_KEY", callAPI: callGroq },
  { id: "deepseek", envKey: "DEEPSEEK_API_KEY", callAPI: callDeepSeek },
];

function buildDueDiligencePrompt(supplier: SupplierProfile): string {
  return `You are an expert supplier analyst for dropshipping businesses. Analyze this supplier and generate a comprehensive due diligence report.

SUPPLIER DATA:
- Name: ${supplier.name}
- Location: ${supplier.location} (${supplier.country})
- Trust Badge: ${supplier.trustBadge}
- Data Source: ${supplier.dataSource}
- Year Established: ${supplier.stats.yearEstablished}
- Specializations: ${supplier.specializations.join(", ")}
- Rating: ${supplier.stats.rating}/5 (${supplier.stats.reviews} reviews)
- Reliability Score: ${supplier.stats.reliabilityScore}%
- Response Time: ${supplier.stats.responseTime} (${supplier.stats.responseTimeHours}h)
- Shipping Days (US): ${supplier.stats.shippingDays}
- Order Completion Rate: ${supplier.stats.orderCompletionRate}%
- Dispute Rate: ${supplier.stats.disputeRate}%
- Monthly Orders: ${supplier.stats.monthlyOrders}
- Total Products: ${supplier.stats.totalProducts}
- Quality Score: ${supplier.stats.qualityScore}/100
- Communication Score: ${supplier.stats.communicationScore}/100
- Price Competitiveness: ${supplier.stats.priceCompetitiveness}/100
- Shipping Methods: ${supplier.shipping.methods.join(", ")}
- Processing Time: ${supplier.shipping.processingTime}
- Packaging Quality: ${supplier.shipping.packagingQuality}
- Inspection: ${supplier.quality.inspection}
- Return Policy: ${supplier.quality.returnPolicy}
- Refund Policy: ${supplier.quality.refundPolicy}
- Certifications: ${supplier.quality.certifications.join(", ") || "None"}
- Categories: ${supplier.catalog.categories.join(", ")}
- Price Range: $${supplier.catalog.priceRange.min} - $${supplier.catalog.priceRange.max}
- MOQ: ${supplier.catalog.moq}
- Samples Available: ${supplier.catalog.samplesAvailable}
- Communication Methods: ${supplier.communication.methods.join(", ")}
- Languages: ${supplier.communication.languages.join(", ")}
- Support Hours: ${supplier.communication.supportHours}

Generate a JSON report with this exact structure:
{
  "overallRiskScore": <number 0-100, lower is safer>,
  "riskLevel": "<low|medium|high|critical>",
  "redFlags": [
    {
      "type": "<review_manipulation|price_gouging|stock_unreliable|slow_shipping|high_refunds|new_supplier|fake_orders>",
      "severity": "<warning|critical>",
      "evidence": "<specific evidence from the data>",
      "detectedAt": "<ISO date string>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "historyAnalysis": {
    "reviewPattern": "<organic|suspicious|mixed>",
    "averageReviewAge": <number in days>,
    "refundTrend": "<improving|stable|declining>",
    "priceStability": "<stable|volatile|declining>",
    "stockConsistency": <number 0-100>
  },
  "recommendation": {
    "verdict": "<recommended|caution|avoid>",
    "confidence": <number 0-100>,
    "summary": "<2-3 sentence summary>",
    "bestFor": ["<use case 1>", "<use case 2>"],
    "avoidFor": ["<use case 1>", "<use case 2>"]
  },
  "comparableSupplierIds": []
}

ANALYSIS RULES:
1. Risk Score Calculation:
   - Start at 50 (neutral)
   - High rating (4.5+) and reliability (85%+): -20
   - Gold badge: -10, Silver: 0, Bronze: +10
   - Low dispute rate (<2%): -10, High (>5%): +20
   - Fast response (<4h): -5, Slow (>24h): +15
   - Many reviews (1000+): -5, Few reviews (<100): +10
   - Established (5+ years): -5, New (<2 years): +10
   - Live data source: -5, Estimated: +5

2. Red Flags: Only flag genuine concerns backed by data patterns
3. Strengths: Highlight what makes this supplier stand out
4. Be specific and data-driven, not generic
5. Return ONLY valid JSON, no markdown or code fences`;
}

function parseAIResponse(response: string): Omit<SupplierDueDiligence, "supplierId" | "supplierName" | "generatedAt" | "expiresAt"> {
  let cleaned = response.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);

  // Clamp values
  parsed.overallRiskScore = Math.max(0, Math.min(100, parsed.overallRiskScore || 50));
  if (parsed.recommendation) {
    parsed.recommendation.confidence = Math.max(0, Math.min(100, parsed.recommendation.confidence || 50));
  }
  if (parsed.historyAnalysis) {
    parsed.historyAnalysis.stockConsistency = Math.max(0, Math.min(100, parsed.historyAnalysis.stockConsistency || 50));
  }

  return parsed;
}

export async function generateDueDiligenceReport(
  supplier: SupplierProfile,
  providerPriority?: Array<{ id: string; active: boolean; priority: number }>
): Promise<{ report: Omit<SupplierDueDiligence, "generatedAt" | "expiresAt">; provider: string }> {
  const prompt = buildDueDiligencePrompt(supplier);

  const orderedProviders = providerPriority
    ? providerPriority
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
      const parsed = parseAIResponse(response);

      const now = new Date();
      const _expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      return {
        report: {
          ...parsed,
          supplierId: supplier.id,
          supplierName: supplier.name,
        },
        provider: provider.id,
      };
    } catch (error) {
      lastError = `${provider.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
      continue;
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError}`);
}
