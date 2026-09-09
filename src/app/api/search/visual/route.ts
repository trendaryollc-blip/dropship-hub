import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ route: "api/search/visual" });

export const POST = withAuth(async (request: NextRequest, _uid: string) => {
  try {
    const { image } = await request.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    // Extract base64 data
    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    // Use OpenAI Vision API to describe the product in the image
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: generate a generic search query
      return NextResponse.json({
        query: "similar products",
        description: "Image uploaded for product search",
      });
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a product identification assistant. Analyze the image and return a JSON object with: { \"query\": \"search terms for finding this product to buy wholesale\", \"description\": \"brief product description\", \"category\": \"product category\" }. Return ONLY valid JSON, no markdown.",
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Data}`,
                  },
                },
                {
                  type: "text",
                  text: "Identify this product and provide search terms to find it on wholesale/dropshipping platforms.",
                },
              ],
            },
          ],
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        logger.warn("[visual-search] OpenAI API error", { status: response.status });
        return NextResponse.json({
          query: "similar products",
          description: "Could not analyze image",
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          query: parsed.query || "similar products",
          description: parsed.description || "",
          category: parsed.category || "",
        });
      }

      return NextResponse.json({
        query: content.trim() || "similar products",
        description: "",
      });
    } catch (aiError) {
      logger.error("[visual-search] AI analysis failed", { error: aiError });
      return NextResponse.json({
        query: "similar products",
        description: "Image analysis failed",
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Visual search failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
