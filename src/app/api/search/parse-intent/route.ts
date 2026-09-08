import { NextRequest, NextResponse } from "next/server";
import { parseIntentLocally, parseIntentWithAI } from "@/lib/search/intent-parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    let intent;
    const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;

    if (apiKey && query.trim().length >= 3) {
      try {
        intent = await parseIntentWithAI(query.trim(), async (prompt) => {
          const url = process.env.GROQ_API_KEY
            ? "https://api.groq.com/openai/v1/chat/completions"
            : "https://api.openai.com/v1/chat/completions";

          const model = process.env.GROQ_API_KEY
            ? "llama-3.1-8b-instant"
            : "gpt-4o-mini";

          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.1,
              max_tokens: 500,
            }),
            signal: AbortSignal.timeout(5000),
          });

          if (!res.ok) throw new Error("AI API failed");
          const data = await res.json();
          return data.choices?.[0]?.message?.content || "";
        });
      } catch {
        intent = parseIntentLocally(query.trim());
      }
    } else {
      intent = parseIntentLocally(query.trim());
    }

    return NextResponse.json({ intent });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
