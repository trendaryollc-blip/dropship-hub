import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("ad-creatives/generator", () => {
  const mockFetch = vi.fn();
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    savedEnv.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    savedEnv.GROQ_API_KEY = process.env.GROQ_API_KEY;
    savedEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    savedEnv.GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
    savedEnv.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
    savedEnv.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (savedEnv.OPENAI_API_KEY !== undefined) process.env.OPENAI_API_KEY = savedEnv.OPENAI_API_KEY;
    else delete process.env.OPENAI_API_KEY;
    if (savedEnv.GROQ_API_KEY !== undefined) process.env.GROQ_API_KEY = savedEnv.GROQ_API_KEY;
    else delete process.env.GROQ_API_KEY;
    if (savedEnv.ANTHROPIC_API_KEY !== undefined) process.env.ANTHROPIC_API_KEY = savedEnv.ANTHROPIC_API_KEY;
    else delete process.env.ANTHROPIC_API_KEY;
    if (savedEnv.GOOGLE_AI_API_KEY !== undefined) process.env.GOOGLE_AI_API_KEY = savedEnv.GOOGLE_AI_API_KEY;
    else delete process.env.GOOGLE_AI_API_KEY;
    if (savedEnv.MISTRAL_API_KEY !== undefined) process.env.MISTRAL_API_KEY = savedEnv.MISTRAL_API_KEY;
    else delete process.env.MISTRAL_API_KEY;
    if (savedEnv.DEEPSEEK_API_KEY !== undefined) process.env.DEEPSEEK_API_KEY = savedEnv.DEEPSEEK_API_KEY;
    else delete process.env.DEEPSEEK_API_KEY;
  });

  async function importFresh() {
    vi.resetModules();
    return import("./generator");
  }

  it("calls first available provider and returns creatives", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    let fetchCallCount = 0;
    mockFetch.mockImplementation(async (url: string) => {
      fetchCallCount++;
      if (typeof url === "string" && url.includes("/models")) {
        return { ok: true, json: async () => ({ data: [{ id: "gpt-4o-mini" }] }) };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify([
                { type: "headline", content: "Shop Now - 50% Off!" },
                { type: "description", content: "Limited time offer on wireless earbuds" },
              ]),
            },
          }],
        }),
      };
    });

    const { generateCreatives } = await importFresh();
    const result = await generateCreatives({
      platform: "facebook",
      productTitle: "Wireless Earbuds",
      types: ["headline", "description"],
      count: 2,
    });

    expect(result.creatives).toHaveLength(2);
    expect(result.provider).toBe("openai");
    expect(result.creatives[0].content).toContain("Shop Now");
  });

  it("falls back to next provider on failure", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.GROQ_API_KEY = "groq-key";

    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : "";
      const body = init?.body ? String(init.body) : "";

      if (urlStr.includes("api.openai.com")) {
        if (urlStr.includes("/models")) {
          return { ok: true, json: async () => ({ data: [{ id: "gpt-4o" }] }) };
        }
        throw new Error("OpenAI chat failed");
      }

      if (urlStr.includes("api.groq.com")) {
        if (urlStr.includes("/models")) {
          return { ok: true, json: async () => ({ data: [{ id: "llama-3" }] }) };
        }
        return {
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify([
                  { type: "headline", content: "Fallback Headline" },
                ]),
              },
            }],
          }),
        };
      }

      return { ok: false, json: async () => ({}) };
    });

    const { generateCreatives } = await importFresh();
    const result = await generateCreatives({
      platform: "facebook",
      productTitle: "Wireless Earbuds",
      types: ["headline"],
      count: 1,
    });

    expect(result.creatives).toHaveLength(1);
    expect(result.provider).toBe("groq");
  });

  it("throws when all providers fail", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { generateCreatives } = await importFresh();
    await expect(
      generateCreatives({
        platform: "facebook",
        productTitle: "Test",
        types: ["headline"],
      })
    ).rejects.toThrow("All AI providers failed");
  });

  it("skips providers without API keys", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;

    const { generateCreatives } = await importFresh();
    await expect(
      generateCreatives({
        platform: "facebook",
        productTitle: "Test",
        types: ["headline"],
      })
    ).rejects.toThrow("All AI providers failed");
  });
});
