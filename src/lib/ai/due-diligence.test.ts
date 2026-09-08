import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateDueDiligenceReport } from "./due-diligence";
import type { SupplierProfile } from "@/types/supplier";

const mockSupplier: SupplierProfile = {
  id: "cj-dropshipping",
  name: "CJ Dropshipping",
  slug: "cj-dropshipping",
  location: "Yiwu, China",
  country: "CN",
  flag: "\ud83c\udde8\ud83c\uddf3",
  description: "Top dropshipping supplier",
  specializations: ["Electronics", "Fashion"],
  trustBadge: "gold",
  dataSource: "live",
  stats: {
    reliabilityScore: 92, rating: 4.8, reviews: 1500, responseTime: "2h",
    responseTimeHours: 2, shippingDays: 5, shippingDaysEU: 7, orderCompletionRate: 99,
    disputeRate: 0.3, monthlyOrders: 8000, totalProducts: 3000, yearEstablished: 2015,
    communicationScore: 90, qualityScore: 88, priceCompetitiveness: 85,
  },
  shipping: { methods: ["ePacket", "EMS"], processingTime: "1-3 days", freeShippingThreshold: 50, packagingQuality: "premium" },
  quality: { inspection: "Pre-shipment", returnPolicy: "30 days", refundPolicy: "Full refund", replacementPolicy: "Free replacement", disputeResolution: "Mediation", certifications: ["ISO9001"] },
  catalog: { categories: ["Electronics", "Fashion"], priceRange: { min: 1, max: 100 }, moq: 10, samplesAvailable: true, samplePrice: 5 },
  communication: { methods: ["Chat", "Email"], languages: ["English", "Chinese"], supportHours: "24/7" },
  source: "cj",
  sourceUrl: "https://cjdropshipping.com",
  lastUpdated: new Date().toISOString(),
};

function mockProviderResponse(responseText: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ choices: [{ message: { content: responseText } }] }),
  });
}

const validAIResponse = JSON.stringify({
  overallRiskScore: 25,
  riskLevel: "low",
  redFlags: [],
  strengths: ["Gold badge supplier", "High reliability score"],
  historyAnalysis: {
    reviewPattern: "organic",
    averageReviewAge: 45,
    refundTrend: "stable",
    priceStability: "stable",
    stockConsistency: 92,
  },
  recommendation: {
    verdict: "recommended",
    confidence: 88,
    summary: "Excellent supplier with strong metrics.",
    bestFor: ["Electronics"],
    avoidFor: [],
  },
  comparableSupplierIds: [],
});

describe("generateDueDiligenceReport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("generates report using first available provider", async () => {
    vi.stubGlobal("fetch", mockProviderResponse(validAIResponse));
    process.env.OPENAI_API_KEY = "test-key";

    const { report, provider } = await generateDueDiligenceReport(mockSupplier);
    expect(provider).toBe("openai");
    expect(report.supplierId).toBe("cj-dropshipping");
    expect(report.supplierName).toBe("CJ Dropshipping");
    expect(report.overallRiskScore).toBe(25);
    expect(report.riskLevel).toBe("low");
    expect(report.recommendation.verdict).toBe("recommended");
  });

  it("clamps risk score to 0-100 range", async () => {
    const highRiskResponse = JSON.stringify({
      ...JSON.parse(validAIResponse),
      overallRiskScore: 150,
    });
    vi.stubGlobal("fetch", mockProviderResponse(highRiskResponse));
    process.env.OPENAI_API_KEY = "test-key";

    const { report } = await generateDueDiligenceReport(mockSupplier);
    expect(report.overallRiskScore).toBe(100);
  });

  it("clamps confidence to 0-100 range", async () => {
    const highConfResponse = JSON.stringify({
      ...JSON.parse(validAIResponse),
      recommendation: { ...JSON.parse(validAIResponse).recommendation, confidence: 200 },
    });
    vi.stubGlobal("fetch", mockProviderResponse(highConfResponse));
    process.env.OPENAI_API_KEY = "test-key";

    const { report } = await generateDueDiligenceReport(mockSupplier);
    expect(report.recommendation.confidence).toBe(100);
  });

  it("falls back to next provider on failure", async () => {
    const failFetch = vi.fn().mockImplementation((url: string) => {
      // OpenAI requests fail
      if (typeof url === "string" && url.includes("openai.com")) {
        return Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve("Unauthorized") });
      }
      // Anthropic model list succeeds
      if (typeof url === "string" && url.includes("anthropic.com") && url.includes("/models")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) });
      }
      // Anthropic API call succeeds
      if (typeof url === "string" && url.includes("anthropic.com")) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({ content: [{ text: validAIResponse }] }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("Not found") });
    });
    vi.stubGlobal("fetch", failFetch);
    process.env.OPENAI_API_KEY = "test-key";
    process.env.ANTHROPIC_API_KEY = "test-key";

    const { provider } = await generateDueDiligenceReport(mockSupplier);
    expect(provider).toBe("anthropic");
  });

  it("throws when all providers fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("Error") }));
    process.env.OPENAI_API_KEY = "test-key";
    process.env.ANTHROPIC_API_KEY = "test-key";

    await expect(generateDueDiligenceReport(mockSupplier)).rejects.toThrow("All AI providers failed");
  });

  it("skips providers without API keys", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.GROQ_API_KEY;
    process.env.DEEPSEEK_API_KEY = "test-key";

    vi.stubGlobal("fetch", mockProviderResponse(validAIResponse));

    const { provider } = await generateDueDiligenceReport(mockSupplier);
    expect(provider).toBe("deepseek");
  });

  it("strips markdown code fences from AI response", async () => {
    const fencedResponse = "```json\n" + validAIResponse + "\n```";
    vi.stubGlobal("fetch", mockProviderResponse(fencedResponse));
    process.env.OPENAI_API_KEY = "test-key";

    const { report } = await generateDueDiligenceReport(mockSupplier);
    expect(report.overallRiskScore).toBe(25);
  });

  it("respects providerPriority ordering", async () => {
    vi.stubGlobal("fetch", mockProviderResponse(validAIResponse));
    process.env.DEEPSEEK_API_KEY = "test-key";
    process.env.OPENAI_API_KEY = "test-key";

    const { provider } = await generateDueDiligenceReport(mockSupplier, [
      { id: "deepseek", active: true, priority: 1 },
      { id: "openai", active: true, priority: 2 },
    ]);
    expect(provider).toBe("deepseek");
  });

  it("skips inactive providers in priority list", async () => {
    vi.stubGlobal("fetch", mockProviderResponse(validAIResponse));
    process.env.OPENAI_API_KEY = "test-key";
    process.env.DEEPSEEK_API_KEY = "test-key";

    const { provider } = await generateDueDiligenceReport(mockSupplier, [
      { id: "deepseek", active: false, priority: 1 },
      { id: "openai", active: true, priority: 2 },
    ]);
    expect(provider).toBe("openai");
  });

  it("handles invalid JSON from AI gracefully", async () => {
    vi.stubGlobal("fetch", mockProviderResponse("not valid json"));
    process.env.OPENAI_API_KEY = "test-key";

    await expect(generateDueDiligenceReport(mockSupplier)).rejects.toThrow();
  });
});
