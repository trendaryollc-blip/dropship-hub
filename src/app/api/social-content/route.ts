import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { generateSingleContent, generateBatchContent, generateUGCCreation, generateContentIdeas } from "@/lib/social-content";
import { addSocialContent, getSocialContent, deleteSocialContent, getContentStats } from "@/lib/data/social-content";
import type { SocialPlatform, ContentType, ContentTone, UGCCreation } from "@/types/social-content";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "generate") {
      const { productTitle, productImage, platform, contentType, tone, targetAudience } = body;
      if (!productTitle || !platform || !contentType || !tone) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const content = generateSingleContent({ productTitle, productImage, platform, contentType, tone, targetAudience: targetAudience || "" });
      const id = await addSocialContent(uid, { ...content, saved: false } as any);
      content.id = id || "";
      return NextResponse.json({ success: true, content });
    }

    if (action === "batch") {
      const { productTitle, productDescription, productImage, platforms, contentTypes, tone, targetAudience, count } = body;
      if (!productTitle || !platforms?.length || !contentTypes?.length || !tone) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const result = generateBatchContent({
        productTitle, productDescription: productDescription || "", productImage,
        platforms, contentTypes, tone, targetAudience: targetAudience || "", count: count || 10,
      });
      for (const content of result.contents) {
        const id = await addSocialContent(uid, { ...content, saved: false } as any);
        content.id = id || "";
      }
      return NextResponse.json({ success: true, result });
    }

    if (action === "ugc") {
      const { productTitle, productDescription, productImage, style, platform } = body;
      if (!productTitle || !style || !platform) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const ugc = generateUGCCreation({ productTitle, productDescription: productDescription || "", productImage, style, platform });
      return NextResponse.json({ success: true, ugc });
    }

    if (action === "ideas") {
      const { productTitle, platform } = body;
      if (!productTitle || !platform) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const ideas = generateContentIdeas(productTitle, platform);
      return NextResponse.json({ success: true, ideas });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "list";

    if (type === "stats") {
      const stats = await getContentStats(uid);
      return NextResponse.json({ stats });
    }

    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const contents = await getSocialContent(uid, limit);
    return NextResponse.json({ contents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const deleted = await deleteSocialContent(uid, id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});
