import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, AIChatSchema } from "@/lib/validation";

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

function buildContextualSystemPrompt(ctx: BusinessContext): string {
  const criticalCount = ctx.alerts.critical.length + ctx.customerService.escalatedQueue;
  const urgentLabel = criticalCount > 0 ? `\n\n*** URGENT: ${criticalCount} CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION ***` : "";

  return `You are DropShip Hub's AI Command Center — a senior dropshipping business analyst with FULL access to the user's live business data. You are NOT a generic chatbot. You know their exact numbers, their exact problems, and their exact opportunities.

CURRENT BUSINESS STATE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

RULES — FOLLOW STRICTLY:
1. ALWAYS reference the user's ACTUAL data from above — never give generic advice when you have real numbers
2. Prioritize CRITICAL issues first, then opportunities, then general advice
3. Be PRESCRIPTIVE: tell them exactly what to DO, not just what to think about
4. Use markdown: **bold**, bullet points, numbered lists, sections
5. When suggesting actions, reference the exact page: "Go to /revenue to...", "Check /suppliers for..."
6. If data is empty or zero, acknowledge it and guide them to set it up
7. Cross-reference data sources: connect supplier issues to product performance, revenue drops to lifecycle changes, etc.
8. Keep responses concise but thorough — every sentence should be actionable
9. Never make up data — if something isn't tracked yet, say so
10. End every response with 1-3 specific next steps`;
}

// ── Provider implementations ──────────────────────────────────────

async function callOpenAI(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callAnthropic(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const userMessages = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2048, system: systemPrompt, messages: userMessages }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || "No response.";
}

async function callGemini(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const contents = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

async function callGroq(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callMistral(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "mistral-small-latest", messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callDeepSeek(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callCohere(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const chatHistory = messages.slice(0, -1).map((m) => ({ role: m.role === "assistant" ? "CHATBOT" : "USER", message: m.content }));
  const lastMsg = messages[messages.length - 1]?.content || "";
  const res = await fetch("https://api.cohere.com/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "command-r-plus", message: lastMsg, chat_history: chatHistory, preamble: systemPrompt }),
  });
  if (!res.ok) throw new Error(`Cohere ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.text || "No response.";
}

async function callTogether(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "meta-llama/Llama-3-70b-chat-hf", messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Together ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callFireworks(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "accounts/fireworks/models/llama-v3p1-70b-instruct", messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Fireworks ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callOpenRouter(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "meta-llama/llama-3.1-70b-instruct", messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callHuggingFace(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-70B-Instruct", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "meta-llama/Llama-3.1-70B-Instruct",
      messages: [{ role: "system", content: systemPrompt }, ...formatted],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`HuggingFace ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || data.generated_text || "No response.";
}

async function callHPC(messages: AIMessage[], apiKey: string, systemPrompt: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.hpc-ai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "llama-3.1-70b", messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`HPC AI ${res.status}: ${await res.text()}`);
  const data = await res.json();
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
  { id: "anthropic", name: "Anthropic (Claude)", envKey: "ANTHROPIC_API_KEY", callAPI: callAnthropic },
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
  yield* streamOpenAICompatible(
    "https://api.openai.com/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    { model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048, stream: true },
    openAICompatibleTokenExtractor,
  );
}

async function* streamGroq(messages: AIMessage[], apiKey: string, systemPrompt: string): AsyncGenerator<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  yield* streamOpenAICompatible(
    "https://api.groq.com/openai/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    { model: "llama-3.1-8b-instant", messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048, stream: true },
    openAICompatibleTokenExtractor,
  );
}

async function* streamGemini(messages: AIMessage[], apiKey: string, systemPrompt: string): AsyncGenerator<string> {
  const contents = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Gemini streams JSON arrays
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
  yield* streamOpenAICompatible(
    "https://api.mistral.ai/v1/chat/completions",
    { Authorization: `Bearer ${apiKey}` },
    { model: "mistral-small-latest", messages: [{ role: "system", content: systemPrompt }, ...formatted], temperature: 0.7, max_tokens: 2048, stream: true },
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

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const parseResult = validateBody(AIChatSchema, await request.json());
    if (!parseResult.success) return parseResult.response;
    const { messages, providerPriority, context, stream } = parseResult.data;

    // Build system prompt — contextual if business data provided, else generic
    const systemPrompt = context
      ? buildContextualSystemPrompt(context as unknown as BusinessContext)
      : BASE_SYSTEM_PROMPT;

    // Build ordered list from user preference or default priority
    const orderedProviders = providerPriority
      ? providerPriority
          .filter((p: { id: string; active: boolean }) => p.active)
          .sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority)
          .map((p: { id: string }) => allProviders.find((pr) => pr.id === p.id))
          .filter(Boolean)
      : allProviders;

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
        const apiKey = process.env[provider.envKey];
        if (!apiKey) {
          lastError = `${provider.name}: No API key configured`;
          continue;
        }

        // Test the provider with a real chat call before streaming
        const nonStreamingProvider = allProviders.find((p) => p.id === provider.id);
        if (nonStreamingProvider) {
          try {
            await nonStreamingProvider.callAPI([{ role: "user", content: "Say hi" }], apiKey, systemPrompt);
          } catch (error) {
            lastError = `${provider.name}: ${error instanceof Error ? error.message : "Test failed"}`;
            continue;
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
          lastError = `${provider.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
          continue;
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
      const apiKey = process.env[provider.envKey];
      if (!apiKey) {
        lastError = `${provider.name}: No API key configured`;
        continue;
      }

      try {
        const response = await provider.callAPI(messages, apiKey, systemPrompt);
        return NextResponse.json({ response, provider: provider.name, providerId: provider.id });
      } catch (error) {
        lastError = `${provider.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
        continue;
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
export const GET = withAuth(async () => {
  const available = allProviders.map((p) => ({
    id: p.id,
    name: p.name,
    configured: !!process.env[p.envKey],
  }));
  return NextResponse.json({ providers: available });
}, LIMITS.AI_CHAT);
