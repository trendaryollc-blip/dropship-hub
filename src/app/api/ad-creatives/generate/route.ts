import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { generateCreatives } from "@/lib/ad-creatives/generator";
import { addAdCreative } from "@/lib/data/ad-creatives";
import { GenerateCreativeInputSchema } from "@/lib/data/schemas";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(GenerateCreativeInputSchema, body);
    if (!validation.success) return validation.response;

    const { platform, productTitle, productDescription, targetAudience, tone, types, count, providerPriority } = validation.data;

    const { creatives: generated, provider } = await generateCreatives({
      platform,
      productTitle,
      productDescription,
      targetAudience,
      tone,
      types,
      count: count || 3,
      providerPriority,
    });

    const savedIds: string[] = [];
    for (const creative of generated) {
      const campaignId = body.campaignId || "unassigned";
      const id = await addAdCreative(uid, {
        campaignId,
        platform,
        type: creative.type,
        content: creative.content,
        aiProvider: provider,
      });
      if (id) savedIds.push(id);
    }

    return NextResponse.json({
      success: true,
      provider,
      creatives: generated,
      savedIds,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate creatives", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
