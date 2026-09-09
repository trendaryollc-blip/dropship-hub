import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, AIChatSchema } from "@/lib/validation";
import { getSupplierById } from "@/lib/supplier-service";

interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface BusinessContext {
  revenue: {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    trend: "up" | "down" | "stable";
    profitMargin: number;
    totalOrders: number;
    avgOrderValue: number;
  };
  products: {
    totalTracked: number;
    byStage: { discovery: number; testing: number; winning: number; scaling: number; saturation: number; sunset: number };
    topPerformers: { title: string; profit: number; trend: string; stage: string }[];
    underPerformers: { title: string; profit: number; issue: string }[];
    recentAlerts: { title: string; severity: string; description: string }[];
  };
  suppliers: {
    totalActive: number;
    avgReliability: number;
    criticalAlerts: { supplierName: string; title: string; severity: string; description: string }[];
    topSupplier: string;
    worstSupplier: string;
    avgShippingDays: number;
    avgRefundRate: number;
  };
  orders: {
    pendingRouting: number;
    totalRouted: number;
    avgShippingDays: number;
    avgCost: number;
    recentDecisions: { productTitle: string; selectedSupplier: string; shippingDays: number; status: string }[];
  };
  customerService: {
    activeConversations: number;
    escalatedQueue: number;
    resolutionRate: number;
    aiHandledPercent: number;
    totalHandled: number;
    recentEscalations: { customerName: string; reason: string; subject: string }[];
  };
  alerts: {
    unread: number;
    critical: { title: string; description: string; type: string }[];
    opportunities: { title: string; description: string }[];
    risks: { title: string; description: string }[];
    warnings: { title: string; description: string }[];
  };
  store: {
    connected: number;
    productsLive: number;
    productsErrored: number;
    platforms: string[];
  };
  missions: {
    completedToday: number;
    totalToday: number;
  };
  competitors: {
    recentlyAnalyzed: number;
    topQueries: string[];
  };
  digest: {
    hasLatest: boolean;
    lastDate: string;
    lastRevenue: number;
    lastOrders: number;
  };
  healthScore: {
    overall: number;
    financial: number;
    products: number;
    suppliers: number;
    customerService: number;
    operations: number;
  };
}

const BASE_SYSTEM_PROMPT = "You are a helpful dropshipping assistant for DropShip Hub. Give concise, actionable advice about products, suppliers, pricing, and market trends. Use markdown formatting.";

function buildSupplierSystemPrompt(supplier: Awaited<ReturnType<typeof getSupplierById>>): string {
  if (!supplier) return BASE_SYSTEM_PROMPT;

  return `You are an AI supplier analyst for DropShip Hub with deep knowledge of this specific supplier. Use the real data below to give specific, actionable answers. Never make up data — only reference what's provided.

SUPPLIER PROFILE: ${supplier.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BASIC INFO:
  ID: ${supplier.id}
  Location: ${supplier.flag} ${supplier.location}
  Source: ${supplier.source.toUpperCase()}
  Trust Badge: ${supplier.trustBadge.toUpperCase()}
  Data Source: ${supplier.dataSource}
  Year Established: ${supplier.stats.yearEstablished}
  Specializations: ${supplier.specializations.join(", ")}

STATS & SCORES:
  Reliability Score: ${supplier.stats.reliabilityScore}/100
  Quality Score: ${supplier.stats.qualityScore}/100
  Communication Score: ${supplier.stats.communicationScore}/100
  Price Competitiveness: ${supplier.stats.priceCompetitiveness}/100
  Rating: ${supplier.stats.rating}/5 (${supplier.stats.reviews} reviews)
  Order Completion Rate: ${supplier.stats.orderCompletionRate}%
  Dispute Rate: ${supplier.stats.disputeRate}%
  Monthly Orders: ${supplier.stats.monthlyOrders.toLocaleString()}

SHIPPING & LOGISTICS:
  Methods: ${supplier.shipping.methods.join(", ")}
  Processing Time: ${supplier.shipping.processingTime}
  Shipping to US: ${supplier.stats.shippingDays} days
  Shipping to EU: ${supplier.stats.shippingDaysEU} days
  Free Shipping Threshold: ${supplier.shipping.freeShippingThreshold ? `$${supplier.shipping.freeShippingThreshold}+` : "N/A"}
  Packaging Quality: ${supplier.shipping.packagingQuality}
  Response Time: ${supplier.stats.responseTime} (avg ${supplier.stats.responseTimeHours}h)

QUALITY & POLICIES:
  Inspection: ${supplier.quality.inspection}
  Return Policy: ${supplier.quality.returnPolicy}
  Refund Policy: ${supplier.quality.refundPolicy}
  Replacement Policy: ${supplier.quality.replacementPolicy}
  Dispute Resolution: ${supplier.quality.disputeResolution}
  Certifications: ${supplier.quality.certifications.join(", ") || "None listed"}

CATALOG:
  Total Products: ${supplier.stats.totalProducts.toLocaleString()}
  Categories: ${supplier.catalog.categories.join(", ")}
  Price Range: $${supplier.catalog.priceRange.min} - $${supplier.catalog.priceRange.max}
  MOQ: ${supplier.catalog.moq} unit${supplier.catalog.moq > 1 ? "s" : ""}
  Samples Available: ${supplier.catalog.samplesAvailable ? `Yes${supplier.catalog.samplePrice ? ` ($${supplier.catalog.samplePrice})` : ""}` : "No"}

COMMUNICATION:
  Methods: ${supplier.communication.methods.join(", ")}
  Languages: ${supplier.communication.languages.join(", ")}
  Support Hours: ${supplier.communication.supportHours}

  ${supplier.sourceUrl ? `Source URL: ${supplier.sourceUrl}` : ""}

ANALYSIS GUIDELINES:
1. Always reference the real data above — never give generic advice
2. When recommending, cite specific numbers (reliability score, shipping days, etc.)
3. Flag risks based on actual metrics (high dispute rate, low reliability, etc.)
4. Compare against industry benchmarks when relevant
5. For negotiations, reference their actual MOQ, pricing, and policies
6. Use markdown formatting: **bold**, bullet points, sections
7. Be direct and actionable — this is a business tool, not a chatbot`;
}

function buildContextualSystemPrompt(ctx: BusinessContext): string {
  const criticalCount = ctx.alerts.critical.length + ctx.customerService.escalatedQueue;
  const urgentLabel = criticalCount > 0 ? `\n\n*** URGENT: ${criticalCount} CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION ***` : "";

  return `You are DropShip Hub's AI Command Center — a helpful assistant with access to the user's live business data. Be conversational and helpful. Use the business data below to give specific, actionable answers when relevant.

CURRENT BUSINESS STATE (for reference — use when relevant to the user's question):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HEALTH SCORE: ${ctx.healthScore.overall}/100
  Financial: ${ctx.healthScore.financial}/30 | Products: ${ctx.healthScore.products}/20 | Suppliers: ${ctx.healthScore.suppliers}/20 | CS: ${ctx.healthScore.customerService}/15 | Operations: ${ctx.healthScore.operations}/15

REVENUE:
  Today: $${ctx.revenue.today} | Yesterday: $${ctx.revenue.yesterday} | This Week: $${ctx.revenue.thisWeek} | This Month: $${ctx.revenue.thisMonth}
  Trend: ${ctx.revenue.trend === "up" ? "↑ UP" : ctx.revenue.trend === "down" ? "↓ DOWN" : "→ STABLE"}
  Profit Margin: ${ctx.revenue.profitMargin}% | Orders Today: ${ctx.revenue.totalOrders} | Avg Order: $${ctx.revenue.avgOrderValue}

PRODUCTS (${ctx.products.totalTracked} tracked):
  Discovery: ${ctx.products.byStage.discovery} | Testing: ${ctx.products.byStage.testing} | Winning: ${ctx.products.byStage.winning} | Scaling: ${ctx.products.byStage.scaling} | Saturation: ${ctx.products.byStage.saturation} | Sunset: ${ctx.products.byStage.sunset}
  Top Performers: ${ctx.products.topPerformers.map((p) => `${p.title} ($${p.profit} profit, ${p.trend})`).join(", ") || "None tracked yet"}
  Underperformers: ${ctx.products.underPerformers.map((p) => `${p.title} (${p.issue})`).join(", ") || "None"}
  Product Alerts: ${ctx.products.recentAlerts.map((a) => `${a.title} [${a.severity}]`).join("; ") || "None"}

SUPPLIERS (${ctx.suppliers.totalActive} active):
  Avg Reliability: ${ctx.suppliers.avgReliability}% | Avg Refund Rate: ${(ctx.suppliers.avgRefundRate * 100).toFixed(1)}% | Avg Shipping: ${ctx.suppliers.avgShippingDays} days
  Best: ${ctx.suppliers.topSupplier} | Worst: ${ctx.suppliers.worstSupplier}
  Critical Alerts: ${ctx.suppliers.criticalAlerts.map((a) => `${a.supplierName}: ${a.title}`).join("; ") || "None"}

ORDERS: ${ctx.orders.totalRouted} routed | ${ctx.orders.pendingRouting} pending | Avg shipping: ${ctx.orders.avgShippingDays} days | Avg cost: $${ctx.orders.avgCost}

CUSTOMER SERVICE:
  Active: ${ctx.customerService.activeConversations} | Escalated: ${ctx.customerService.escalatedQueue} | Resolved rate: ${ctx.customerService.resolutionRate}% | AI handled: ${ctx.customerService.aiHandledPercent}%
  Escalations: ${ctx.customerService.recentEscalations.map((e) => `${e.customerName}: "${e.reason}"`).join("; ") || "None"}

ALERTS: ${ctx.alerts.unread} unread (${ctx.alerts.critical.length} critical, ${ctx.alerts.opportunities.length} opportunities, ${ctx.alerts.risks.length} risks, ${ctx.alerts.warnings.length} warnings)
  Critical: ${ctx.alerts.critical.map((a) => `${a.title}: ${a.description}`).join("; ") || "None"}
  Opportunities: ${ctx.alerts.opportunities.map((a) => `${a.title}: ${a.description}`).join("; ") || "None"}
  Risks: ${ctx.alerts.risks.map((a) => `${a.title}: ${a.description}`).join("; ") || "None"}

STORE: ${ctx.store.connected} connected | ${ctx.store.productsLive} live | ${ctx.store.productsErrored} errored | Platforms: ${ctx.store.platforms.join(", ") || "None"}

MISSIONS: ${ctx.missions.completedToday}/${ctx.missions.totalToday} completed today
COMPETITORS: ${ctx.competitors.recentlyAnalyzed} analyzed recently | Queries: ${ctx.competitors.topQueries.join(", ") || "None"}
${urgentLabel}

GUIDELINES:
1. Be conversational and helpful — match the user's tone
2. If the user asks a general question (e.g., "hello", "hi", "help"), give a friendly greeting and offer to help with their business
3. Only dive into detailed business reports when the user explicitly asks for analysis, reports, or specific business questions
4. If the user asks about their business, use the actual data above — never give generic advice when you have real numbers
5. Use markdown formatting: **bold**, bullet points, numbered lists, sections
6. When suggesting actions, reference the exact page: "Go to /revenue to...", "Check /suppliers for..."
7. Keep responses concise — don't dump all business data unless asked for a full report
8. Never make up data — if something isn't tracked yet, say so`;
}

// ── Dynamic Model Resolution ──────────────────────────────────────

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

async function _fetchModels(cacheKey: string, url: string, headers: Record<string, string>, filter?: (id: string) => boolean): Promise<string[]> {
  const hit = _modelCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < _MODEL_TTL) {
    const filtered = filter ? hit.models.filter(filter) : hit.models;
    if (filtered.length) return filtered;
  }
  try {
    const r = await fetch(url, { headers });
    if (!r.ok) return hit?.models || [];
    const d = await r.json();
    const raw: string[] = Array.isArray(d) ? d.map((m: { id: string }) => m.id) : (d.data ?? d.models ?? []).map((m: { id: string }) => m.id);
    const sorted = _sortChatModels(raw);
    if (sorted.length) _modelCache.set(cacheKey, { models: sorted, ts: Date.now() });
    const filtered = filter ? sorted.filter(filter) : sorted;
    return filtered.length ? filtered : (hit?.models || []);
  } catch {
    return hit?.models || [];
  }
}

async function _resolveModel(key: string, url: string, headers: Record<string, string>, fallback: string, filter?: (id: string) => boolean): Promise<string> {
  const models = await _fetchModels(key, url, headers, filter);
  return models[0] || fallback;
}

async function _resolveGeminiModel(apiKey: string): Promise<string> {
  const cacheKey = `gemini:${apiKey.slice(-8)}`;
  const hit = _modelCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < _MODEL_TTL && hit.models.length) return hit.models[0];

  const probeModels = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
  ];

  let lastStatus = 0;
  let lastErrorMsg = "";

  for (const model of probeModels) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] }) }
      );
      const body = await r.text();
      if (r.ok) { _modelCache.set(cacheKey, { models: [model], ts: Date.now() }); return model; }
      lastStatus = r.status;
      try { const j = JSON.parse(body); lastErrorMsg = j.error?.message || body.slice(0, 200); } catch { lastErrorMsg = body.slice(0, 200); }
      console.log(`[Gemini] ${model}: ${r.status} ${lastErrorMsg.slice(0, 200)}`);
    } catch (e) { console.log(`[Gemini] ${model}: ERROR ${e}`); }
  }

  if (lastStatus === 403) {
    throw new Error("Gemini API access denied. Your API key's Google Cloud project does not have Gemini API enabled. Enable it at https://aistudio.google.com/apikey");
  }
  if (lastStatus === 400 && lastErrorMsg.includes("location")) {
    throw new Error("Gemini API is not available in your region. Use a VPN or check supported regions at https://ai.google.dev/gemini-api/docs/available-regions");
  }
  throw new Error(`Gemini: No available models found. Last error: ${lastErrorMsg.slice(0, 200)}`);
}

const _isSmall = (id: string) => /(?:^|[^a-z])(?:0\.5b|1b|3b|7b|8b|9b|small|mini|lite|haiku)(?:$|[^a-z])/i.test(id);
const _isFree = (id: string) => /(?:free|:free)/i.test(id) || _isSmall(id);

// ── Provider implementations ──────────────────────────────────────

async function callOpenAI(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("openai", "https://api.openai.com/v1/models", { Authorization: `Bearer ${apiKey}` }, "gpt-4o-mini");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}


async function callGemini(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const contents = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const model = await _resolveGeminiModel(apiKey);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents,
      system_instruction: { parts: [{ text: systemPrompt }] },
      generation_config: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    let msg = `Gemini API error (${res.status})`;
    try { const j = JSON.parse(errText); msg = j.error?.message || msg; } catch { /* use default */ }
    throw new Error(msg);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

async function callGroq(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("groq", "https://api.groq.com/openai/v1/models", { Authorization: `Bearer ${apiKey}` }, "llama-3.1-8b-instant", _isSmall);
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 1000 }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(`Groq API error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callMistral(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("mistral", "https://api.mistral.ai/v1/models", { Authorization: `Bearer ${apiKey}` }, "mistral-small-latest", _isSmall);
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(`Mistral API error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callDeepSeek(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("deepseek", "https://api.deepseek.com/v1/models", { Authorization: `Bearer ${apiKey}` }, "deepseek-chat", _isSmall);
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(`DeepSeek API error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callCohere(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("cohere", "https://api.cohere.com/v2/models", { Authorization: `Bearer ${apiKey}` }, "command-r7b-12-2024", _isSmall);
  const res = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...formatted] }),
  });
  if (!res.ok) throw new Error(`Cohere ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.message?.content;
  if (Array.isArray(content) && content.length > 0) return content[0].text || "No response.";
  return data.text || "No response.";
}

async function callTogether(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("together", "https://api.together.xyz/v1/models", { Authorization: `Bearer ${apiKey}` }, "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", _isSmall);
  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Together ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(`Together API error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callFireworks(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("fireworks", "https://api.fireworks.ai/inference/v1/models", { Authorization: `Bearer ${apiKey}` }, "accounts/fireworks/models/llama-v3p1-8b-instruct", (id) => /8b/i.test(id));
  const res = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Fireworks ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(`Fireworks API error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callOpenRouter(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("openrouter", "https://openrouter.ai/api/v1/models", { Authorization: `Bearer ${apiKey}` }, "meta-llama/llama-3.1-8b-instruct:free", _isFree);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(`OpenRouter API error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callHuggingFace(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  let model = "Qwen/Qwen2.5-7B-Instruct";
  try {
    const r = await fetch("https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&limit=20", { headers: { Authorization: `Bearer ${apiKey}` } });
    if (r.ok) {
      const d = await r.json();
      const list: Array<{ id: string }> = Array.isArray(d) ? d : (d.data ?? d.models ?? []);
      const ids = list.map((m) => m.id).filter((id) => /(?:7b|8b|3b|1b|0.5b|small|mini)/i.test(id));
      if (ids.length) model = ids[0];
    }
  } catch { /* use default */ }
  const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...formatted],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    let parsed: Record<string, unknown> | null = null;
    try { parsed = JSON.parse(raw); } catch { /* not JSON */ }
    if (res.status === 503 && parsed && typeof parsed.error === "string" && parsed.error.includes("loading")) {
      throw new Error(`HuggingFace model is loading, please try again in a few seconds`);
    }
    throw new Error(`HuggingFace ${res.status}: ${raw}`);
  }
  let data: Record<string, unknown> | null = null;
  try { data = JSON.parse(raw); } catch { throw new Error(`HuggingFace: invalid response`); }
  if (data && typeof data === "object") {
    if (typeof data.error === "string") throw new Error(`HuggingFace API error: ${data.error}`);
    if (data.error && typeof data.error === "object") throw new Error(`HuggingFace API error: ${(data.error as { message?: string }).message || JSON.stringify(data.error)}`);
  }
  const content = (data as Record<string, unknown>)?.choices;
  if (Array.isArray(content) && content.length > 0) {
    const msg = content[0] as Record<string, unknown>;
    const inner = msg?.message as Record<string, unknown> | undefined;
    if (typeof inner?.content === "string") return inner.content;
  }
  return "No response.";
}

async function callHPC(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("hpc", "https://api.hpc-ai.com/inference/v1/models", { Authorization: `Bearer ${apiKey}` }, "llama-3.1-8b-instruct", _isSmall);
  const res = await fetch("https://api.hpc-ai.com/inference/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`HPC AI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(`HPC AI API error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.choices?.[0]?.message?.content || "No response.";
}

// ── Provider registry ─────────────────────────────────────────────

interface ProviderConfig {
  id: string;
  name: string;
  envKey: string;
  callAPI: (messages: AIMessage[], apiKey: string, systemPrompt: string) => Promise<string>;
}

const allProviders: ProviderConfig[] = [
  { id: "groq", name: "Groq", envKey: "GROQ_API_KEY", callAPI: callGroq },
  { id: "gemini", name: "Google Gemini", envKey: "GOOGLE_AI_API_KEY", callAPI: callGemini },
  { id: "openai", name: "OpenAI", envKey: "OPENAI_API_KEY", callAPI: callOpenAI },
  { id: "mistral", name: "Mistral AI", envKey: "MISTRAL_API_KEY", callAPI: callMistral },
  { id: "deepseek", name: "DeepSeek", envKey: "DEEPSEEK_API_KEY", callAPI: callDeepSeek },
  { id: "cohere", name: "Cohere", envKey: "COHERE_API_KEY", callAPI: callCohere },
  { id: "together", name: "Together AI", envKey: "TOGETHER_API_KEY", callAPI: callTogether },
  { id: "fireworks", name: "Fireworks AI", envKey: "FIREWORKS_API_KEY", callAPI: callFireworks },
  { id: "openrouter", name: "OpenRouter", envKey: "OPENROUTER_API_KEY", callAPI: callOpenRouter },
  { id: "huggingface", name: "Hugging Face", envKey: "HUGGINGFACE_API_KEY", callAPI: callHuggingFace },
  { id: "hpc", name: "HPC AI", envKey: "HPC_API_KEY", callAPI: callHPC },
];

// ── Streaming provider calls ─────────────────────────────────────

async function* streamOpenAICompatible(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  extractToken: (json: Record<string, unknown>) => string | undefined,
): AsyncGenerator<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Provider ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const json = JSON.parse(line.slice(6)) as Record<string, unknown>;
          const token = extractToken(json);
          if (token) yield token;
        } catch { /* skip malformed */ }
      }
    }
  }
}

const openAICompatibleTokenExtractor = (json: Record<string, unknown>): string | undefined => {
  const choices = json.choices as Record<string, unknown>[] | undefined;
  const delta = choices?.[0] as Record<string, unknown> | undefined;
  return delta?.content as string | undefined;
};

async function* streamOpenAI(messages: AIMessage[], apiKey: string, systemPrompt: string): AsyncGenerator<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("openai", "https://api.openai.com/v1/models", { Authorization: `Bearer ${apiKey}` }, "gpt-4o-mini");
  yield* streamOpenAICompatible(
    "https://api.openai.com/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    { model, messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048, stream: true },
    openAICompatibleTokenExtractor,
  );
}

async function* streamGroq(messages: AIMessage[], apiKey: string, systemPrompt: string): AsyncGenerator<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("groq", "https://api.groq.com/openai/v1/models", { Authorization: `Bearer ${apiKey}` }, "qwen/qwen3.8-27b");
  yield* streamOpenAICompatible(
    "https://api.groq.com/openai/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    { model, messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 1000, stream: true },
    openAICompatibleTokenExtractor,
  );
}

async function* streamGemini(messages: AIMessage[], apiKey: string, systemPrompt: string): AsyncGenerator<string> {
  const contents = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const model = await _resolveGeminiModel(apiKey);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents,
      system_instruction: { parts: [{ text: systemPrompt }] },
      generation_config: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    let msg = `Gemini API error (${res.status})`;
    try { const j = JSON.parse(errText); msg = j.error?.message || msg; } catch { /* use default */ }
    throw new Error(msg);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch { /* skip partial */ }
    }
  }
}

async function* streamMistral(messages: AIMessage[], apiKey: string, systemPrompt: string): AsyncGenerator<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const model = await _resolveModel("mistral", "https://api.mistral.ai/v1/models", { Authorization: `Bearer ${apiKey}` }, "mistral-small-latest");
  yield* streamOpenAICompatible(
    "https://api.mistral.ai/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    { model, messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048, stream: true },
    openAICompatibleTokenExtractor,
  );
}

// ── Streaming provider registry ──────────────────────────────────

interface StreamProviderConfig {
  id: string;
  name: string;
  envKey: string;
  stream: (messages: AIMessage[], apiKey: string, systemPrompt: string) => AsyncGenerator<string>;
}

const streamProviders: StreamProviderConfig[] = [
  { id: "groq", name: "Groq", envKey: "GROQ_API_KEY", stream: streamGroq },
  { id: "gemini", name: "Google Gemini", envKey: "GOOGLE_AI_API_KEY", stream: streamGemini },
  { id: "openai", name: "OpenAI", envKey: "OPENAI_API_KEY", stream: streamOpenAI },
  { id: "mistral", name: "Mistral AI", envKey: "MISTRAL_API_KEY", stream: streamMistral },
];

// ── Route handler ─────────────────────────────────────────────────

async function getUserApiKeys(uid: string): Promise<Record<string, string[]>> {
  try {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("settings").doc("apiKeys").get();
    const data = snap.exists ? snap.data() : {};
    // Filter out null/empty values
    const keys: Record<string, string[]> = {};
    const providers = [
      "groq", "gemini", "openai", "deepseek",
      "mistral", "cohere", "together", "fireworks", "openrouter",
      "huggingface", "hpc",
    ];
    for (const provider of providers) {
      const rawValue = (data as Record<string, unknown>)[provider];
      if (Array.isArray(rawValue)) {
        const validKeys = rawValue
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .map((k) => k.trim());
        if (validKeys.length > 0) {
          keys[provider] = validKeys;
        }
      } else if (typeof rawValue === "string") {
        // Backward compatibility: single string key
        keys[provider] = [rawValue.trim()];
      }
    }
    console.log("[getUserApiKeys] uid:", uid, "providers with keys:", Object.keys(keys));
    return keys;
  } catch (e) {
    console.error("[getUserApiKeys] FAILED to load user API keys:", e instanceof Error ? e.message : e);
    return {};
  }
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const parseResult = validateBody(AIChatSchema, await request.json());
    if (!parseResult.success) return parseResult.response;
    const { messages, providerPriority, context, stream, testKey, supplierId } = parseResult.data;

    // Build system prompt — supplier-specific if supplierId provided, else contextual or generic
    let systemPrompt: string;
    if (supplierId) {
      const supplier = await getSupplierById(supplierId);
      systemPrompt = buildSupplierSystemPrompt(supplier);
    } else {
      systemPrompt = context
        ? buildContextualSystemPrompt(context as unknown as BusinessContext)
        : BASE_SYSTEM_PROMPT;
    }

    // Build ordered list from user preference or default priority
    const orderedProviders = providerPriority
      ? providerPriority
          .filter((p: { id: string; active: boolean }) => p.active)
          .sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority)
          .map((p: { id: string }) => allProviders.find((pr) => pr.id === p.id))
          .filter(Boolean)
      : allProviders;

    // Get user-saved API keys from Firebase (falls back to env vars)
    const userApiKeys = await getUserApiKeys(uid);

    // If testKey provided (from settings test connection), inject it for the target provider
    if (testKey && orderedProviders.length === 1) {
      const targetId = orderedProviders[0]!.id;
      userApiKeys[targetId] = [testKey];
    }

    // Helper: resolve API key for a provider with multi-key fallback
    const _resolveApiKey = (envKey: string, providerId: string): string | undefined => {
      const userKeys = userApiKeys[providerId];
      if (userKeys && userKeys.length > 0) {
        return userKeys[0];
      }
      return process.env[envKey];
    };

    const _getNextKeyIndex = (providerId: string): number => {
      const userKeys = userApiKeys[providerId];
      if (!userKeys || userKeys.length <= 1) return 0;
      return 0;
    };

    // ── Streaming mode ──────────────────────────────────────
    if (stream) {
      const streamOrdered = providerPriority
        ? providerPriority
            .filter((p: { id: string; active: boolean }) => p.active)
            .sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority)
            .map((p: { id: string }) => streamProviders.find((sp) => sp.id === p.id))
            .filter(Boolean)
        : streamProviders;

      let lastError = "";

      for (const provider of streamOrdered) {
        if (!provider) continue;
        
        // Get all available keys for this provider
        const userKeys = userApiKeys[provider.id] || [];
        const envKey = process.env[provider.envKey];
        
        // Try each key in sequence
        const keysToTry = [...userKeys];
        if (envKey) keysToTry.push(envKey);
        
        if (keysToTry.length === 0) {
          lastError = `${provider.name}: No API key configured`;
          continue;
        }

        for (let keyIndex = 0; keyIndex < keysToTry.length; keyIndex++) {
          const apiKey = keysToTry[keyIndex];
          const isEnvKey = keyIndex >= userKeys.length;
          const keyLabel = isEnvKey ? `env ${provider.envKey}` : `key ${keyIndex + 1}`;

          // Test the provider with a real chat call before streaming
          const nonStreamingProvider = allProviders.find((p) => p.id === provider.id);
          if (nonStreamingProvider) {
            try {
              await nonStreamingProvider.callAPI([{ role: "user", content: "Say hi" }], apiKey, systemPrompt);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : "Test failed";
              
              // Check for rate limit errors
              const isRateLimitError = 
                errorMsg.includes("rate limit") ||
                errorMsg.includes("quota") ||
                errorMsg.includes("insufficient_quota") ||
                errorMsg.includes("overdue");
              
              if (isRateLimitError && keyIndex < keysToTry.length - 1) {
                lastError = `${provider.name} (${keyLabel}): ${errorMsg} — trying next key`;
                continue; // Try next key
              }
              
              lastError = `${provider.name} (${keyLabel}): ${errorMsg}`;
              break; // Break inner loop
            }
          }

          // Provider works — stream the real response
          try {
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
              async start(controller) {
                try {
                  controller.enqueue(encoder.encode(JSON.stringify({ type: "provider", name: provider.name }) + "\n"));

                  for await (const token of provider.stream(messages, apiKey, systemPrompt)) {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: "token", content: token }) + "\n"));
                  }

                  controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
                  controller.close();
                } catch (error) {
                  const errMsg = error instanceof Error ? error.message : "Stream error";
                  controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: `${provider.name}: ${errMsg}` }) + "\n"));
                  controller.close();
                }
              },
            });

            return new Response(stream, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              },
            });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            
            // Check for rate limit errors
            const isRateLimitError = 
              errorMsg.includes("rate limit") ||
              errorMsg.includes("quota") ||
              errorMsg.includes("insufficient_quota") ||
              errorMsg.includes("overdue");
            
            if (isRateLimitError && keyIndex < keysToTry.length - 1) {
              lastError = `${provider.name} (${keyLabel}): ${errorMsg} — trying next key`;
              continue; // Try next key
            }
            
            lastError = `${provider.name} (${keyLabel}): ${errorMsg}`;
            break; // Break inner loop
          }
        }
      }

      return NextResponse.json(
        { error: "All streaming providers failed", details: lastError },
        { status: 503 }
      );
    }

    // ── Non-streaming mode (original) ───────────────────────
    let lastError = "";

    for (const provider of orderedProviders) {
      if (!provider) continue;
      
      // Get all available keys for this provider
      const userKeys = userApiKeys[provider.id] || [];
      const envKey = process.env[provider.envKey];
      
      // Try each key in sequence
      const keysToTry = [...userKeys];
      if (envKey) keysToTry.push(envKey);
      
      if (keysToTry.length === 0) {
        lastError = `${provider.name}: No API key configured`;
        continue;
      }

      for (let keyIndex = 0; keyIndex < keysToTry.length; keyIndex++) {
        const apiKey = keysToTry[keyIndex];
        const isEnvKey = keyIndex >= userKeys.length;
        const keyLabel = isEnvKey ? `env ${provider.envKey}` : `key ${keyIndex + 1}`;

        try {
          const response = await provider.callAPI(messages, apiKey, systemPrompt);
          return NextResponse.json({ response, provider: provider.name, providerId: provider.id, keyUsed: keyLabel });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          
          // Check for rate limit errors
          const isRateLimitError = 
            errorMsg.includes("rate limit") ||
            errorMsg.includes("quota") ||
            errorMsg.includes("insufficient_quota") ||
            errorMsg.includes("overdue");
          
          if (isRateLimitError && keyIndex < keysToTry.length - 1) {
            // Try next key for the same provider
            lastError = `${provider.name} (${keyLabel}): ${errorMsg} — trying next key`;
            continue; // Continue to next key in the inner loop
          }
          
          // Not a rate limit error or no more keys to try - record error and move to next provider
          lastError = `${provider.name} (${keyLabel}): ${errorMsg}`;
          break; // Break inner loop, continue to next provider
        }
      }
    }

    return NextResponse.json(
      { error: "All AI providers failed", details: lastError, help: "Add your API keys in Settings → AI Providers" },
      { status: 503 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, LIMITS.AI_CHAT);

// List available providers
export const GET = withAuth(async (_request: NextRequest, uid: string) => {
  const userApiKeys = await getUserApiKeys(uid);
  const available = allProviders.map((p) => ({
    id: p.id,
    name: p.name,
    configured: !!userApiKeys[p.id] || !!process.env[p.envKey],
  }));
  return NextResponse.json({ providers: available });
}, LIMITS.AI_CHAT);
