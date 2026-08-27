import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";

interface IntegrationStatus {
  id: string;
  name: string;
  type: string;
  status: "healthy" | "warning" | "error" | "disconnected";
  lastSync: string;
  issues: string[];
  healthScore: number;
}

interface IntegrationsResult {
  integrations: IntegrationStatus[];
  summary: {
    total: number;
    healthy: number;
    warning: number;
    error: number;
    disconnected: number;
  };
  insights: string[];
  generatedAt: string;
}

function safeStr(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

function safeNum(val: unknown, fallback = 0): number {
  return typeof val === "number" ? val : fallback;
}

function checkProviderStatus(envKeys: string[]): { configured: number; total: number; names: string[] } {
  const providers = [
    { name: "Groq", key: "GROQ_API_KEY" },
    { name: "Gemini", key: "GOOGLE_AI_API_KEY" },
    { name: "OpenAI", key: "OPENAI_API_KEY" },
    { name: "Anthropic", key: "ANTHROPIC_API_KEY" },
    { name: "Mistral", key: "MISTRAL_API_KEY" },
    { name: "DeepSeek", key: "DEEPSEEK_API_KEY" },
  ];

  const configured = providers.filter((p) => !!process.env[p.key]);
  const missing = providers.filter((p) => !process.env[p.key]).map((p) => p.name);

  return {
    configured: configured.length,
    total: providers.length,
    names: missing,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    const [storeSnap, pushedSnap, userDoc] = await Promise.all([
      userRef.collection("storeConnections").get(),
      userRef.collection("pushedProducts").orderBy("pushedAt", "desc").limit(50).get(),
      userRef.get(),
    ]);

    const stores = storeSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentData));
    const pushed = pushedSnap.docs.map((d) => d.data() as DocumentData);
    const userData = userDoc.data() as DocumentData | undefined;

    const integrations: IntegrationStatus[] = [];

    // Store integrations
    for (const store of stores) {
      const storeId = store.id;
      const storeName = safeStr(store.name, "Unknown Store");
      const platform = safeStr(store.platform, "Unknown");
      const status = safeStr(store.status, "unknown");

      const storeProducts = pushed.filter((p) => safeStr(p.storeId) === storeId);
      const errorProducts = storeProducts.filter((p) => safeStr(p.status) === "error").length;
      const lastPush = storeProducts[0] ? safeStr(storeProducts[0].pushedAt) : "Never";

      const issues: string[] = [];
      let healthScore = 100;

      if (status !== "connected") {
        healthScore = 20;
        issues.push("Store disconnected");
      }
      if (errorProducts > 0) {
        healthScore -= errorProducts * 10;
        issues.push(`${errorProducts} product push errors`);
      }
      if (storeProducts.length === 0) {
        issues.push("No products pushed yet");
      }

      healthScore = Math.max(0, Math.min(100, healthScore));

      let healthStatus: IntegrationStatus["status"] = "healthy";
      if (healthScore < 30) healthStatus = "error";
      else if (healthScore < 60) healthStatus = "warning";
      else if (status !== "connected") healthStatus = "disconnected";

      integrations.push({
        id: storeId,
        name: `${platform} — ${storeName}`,
        type: "store",
        status: healthStatus,
        lastSync: lastPush,
        issues,
        healthScore,
      });
    }

    // AI Provider integration
    const aiProviders = checkProviderStatus([]);
    integrations.push({
      id: "ai-providers",
      name: `AI Providers (${aiProviders.configured}/${aiProviders.total})`,
      type: "ai",
      status: aiProviders.configured >= 2 ? "healthy" : aiProviders.configured >= 1 ? "warning" : "error",
      lastSync: new Date().toISOString(),
      issues: aiProviders.names.length > 0 ? [`Missing keys: ${aiProviders.names.join(", ")}`] : [],
      healthScore: Math.round((aiProviders.configured / aiProviders.total) * 100),
    });

    // Firebase integration
    integrations.push({
      id: "firebase",
      name: "Firebase (Auth + Firestore)",
      type: "database",
      status: "healthy",
      lastSync: new Date().toISOString(),
      issues: [],
      healthScore: 100,
    });

    // Email (Resend)
    const hasResend = !!process.env.RESEND_API_KEY;
    integrations.push({
      id: "email",
      name: "Email Service (Resend)",
      type: "email",
      status: hasResend ? "healthy" : "warning",
      lastSync: new Date().toISOString(),
      issues: hasResend ? [] : ["RESEND_API_KEY not configured — emails won't send"],
      healthScore: hasResend ? 100 : 30,
    });

    // Summary
    const summary = {
      total: integrations.length,
      healthy: integrations.filter((i) => i.status === "healthy").length,
      warning: integrations.filter((i) => i.status === "warning").length,
      error: integrations.filter((i) => i.status === "error").length,
      disconnected: integrations.filter((i) => i.status === "disconnected").length,
    };

    const insights: string[] = [];
    if (summary.error > 0) insights.push(`${summary.error} integration${summary.error > 1 ? "s" : ""} need${summary.error === 1 ? "s" : ""} immediate attention`);
    if (summary.warning > 0) insights.push(`${summary.warning} integration${summary.warning > 1 ? "s" : ""} have warnings — check configuration`);
    if (summary.healthy === summary.total) insights.push("All integrations are healthy — your tech stack is running smoothly");
    if (aiProviders.configured < 2) insights.push("Add more AI provider API keys for better reliability and fallback coverage");

    return NextResponse.json({
      integrations,
      summary,
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check integrations", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
