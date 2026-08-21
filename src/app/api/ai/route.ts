import { NextRequest, NextResponse } from "next/server";

interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = "You are a helpful dropshipping assistant for DropShip Hub. Give concise, actionable advice about products, suppliers, pricing, and market trends. Use markdown formatting.";

// ── Provider implementations ──────────────────────────────────────

async function callOpenAI(messages: AIMessage[], apiKey: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callAnthropic(messages: AIMessage[], apiKey: string): Promise<string> {
  const userMessages = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2048, system: SYSTEM_PROMPT, messages: userMessages }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || "No response.";
}

async function callGemini(messages: AIMessage[], apiKey: string): Promise<string> {
  const contents = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

async function callGroq(messages: AIMessage[], apiKey: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callMistral(messages: AIMessage[], apiKey: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "mistral-small-latest", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callDeepSeek(messages: AIMessage[], apiKey: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callCohere(messages: AIMessage[], apiKey: string): Promise<string> {
  const chatHistory = messages.slice(0, -1).map((m) => ({ role: m.role === "assistant" ? "CHATBOT" : "USER", message: m.content }));
  const lastMsg = messages[messages.length - 1]?.content || "";
  const res = await fetch("https://api.cohere.com/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "command-r-plus", message: lastMsg, chat_history: chatHistory, preamble: SYSTEM_PROMPT }),
  });
  if (!res.ok) throw new Error(`Cohere ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.text || "No response.";
}

async function callTogether(messages: AIMessage[], apiKey: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "meta-llama/Llama-3-70b-chat-hf", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Together ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callFireworks(messages: AIMessage[], apiKey: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "accounts/fireworks/models/llama-v3p1-70b-instruct", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Fireworks ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callOpenRouter(messages: AIMessage[], apiKey: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "meta-llama/llama-3.1-70b-instruct", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response.";
}

async function callHuggingFace(messages: AIMessage[], apiKey: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-70B-Instruct", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ inputs: { messages: [{ role: "system", content: SYSTEM_PROMPT }, ...formatted] }, parameters: { temperature: 0.7, max_new_tokens: 2048 } }),
  });
  if (!res.ok) throw new Error(`HuggingFace ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || data.generated_text || "No response.";
}

async function callHPC(messages: AIMessage[], apiKey: string): Promise<string> {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.hpc-ai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "llama-3.1-70b", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...formatted], temperature: 0.7, max_tokens: 2048 }),
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
  callAPI: (messages: AIMessage[], apiKey: string) => Promise<string>;
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

// ── Route handler ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { messages, providerPriority } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    // Build ordered list from user preference or default priority
    const orderedProviders = providerPriority
      ? providerPriority
          .filter((p: { id: string; active: boolean }) => p.active)
          .sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority)
          .map((p: { id: string }) => allProviders.find((pr) => pr.id === p.id))
          .filter(Boolean)
      : allProviders;

    let lastError = "";

    for (const provider of orderedProviders) {
      if (!provider) continue;
      const apiKey = process.env[provider.envKey];
      if (!apiKey) {
        lastError = `${provider.name}: No API key configured`;
        continue;
      }

      try {
        const response = await provider.callAPI(messages, apiKey);
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
}

// List available providers
export async function GET() {
  const available = allProviders.map((p) => ({
    id: p.id,
    name: p.name,
    configured: !!process.env[p.envKey],
  }));
  return NextResponse.json({ providers: available });
}
