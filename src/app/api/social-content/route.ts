import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { generateSingleContent, generateBatchContent, generateUGCCreation, generateContentIdeas } from "@/lib/social-content";
import {
  addSocialContent,
  getSocialContent,
  deleteSocialContent,
  updateSocialContent,
  getContentStats,
  getCalendarEntries,
  addCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
} from "@/lib/data/social-content";
import type { SocialPlatform, ContentType, ContentTone, UGCCreation } from "@/types/social-content";
import { safeErrorMessage } from "@/lib/api-errors";

// ── Enum allowlists (validated before any Firestore write) ───────────────────

const SOCIAL_PLATFORMS = ["tiktok", "instagram_reels", "youtube_shorts", "facebook_reels", "pinterest_pins"];
const CONTENT_TYPE_VALUES = ["hook", "caption", "script", "hashtag_set", "ad_copy", "ugc_script", "story", "carousel"];
const TONE_VALUES = ["urgent", "casual", "luxury", "funny", "educational", "emotional", "hype", "relatable"];
const UGC_STYLE_VALUES = ["unboxing", "review", "tutorial", "before_after", "lifestyle", "comparison", "problem_solution"];
const CALENDAR_STATUSES = ["draft", "scheduled", "posted", "cancelled"];

const isEnum = (list: string[], value: unknown): boolean =>
  typeof value === "string" && list.includes(value);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "generate") {
      const { productTitle, productImage, platform, contentType, tone, targetAudience } = body;
      if (!productTitle || !platform || !contentType || !tone) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      if (!isEnum(SOCIAL_PLATFORMS, platform) || !isEnum(CONTENT_TYPE_VALUES, contentType) || !isEnum(TONE_VALUES, tone)) {
        return NextResponse.json({ error: "Invalid platform, contentType or tone" }, { status: 400 });
      }
      const content = generateSingleContent({
        productTitle: String(productTitle).slice(0, 200),
        productImage: typeof productImage === "string" ? productImage.slice(0, 500) : "",
        platform: platform as SocialPlatform,
        contentType: contentType as ContentType,
        tone: tone as ContentTone,
        targetAudience: typeof targetAudience === "string" ? targetAudience.slice(0, 200) : "",
      });
      const id = await addSocialContent(uid, { ...content, saved: false });
      content.id = id || "";
      return NextResponse.json({ success: true, content });
    }

    if (action === "batch") {
      const { productTitle, productDescription, productImage, platforms, contentTypes, tone, targetAudience, count } = body;
      if (!productTitle || !platforms?.length || !contentTypes?.length || !tone) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      if (
        !Array.isArray(platforms) ||
        !Array.isArray(contentTypes) ||
        !platforms.every((p: unknown) => isEnum(SOCIAL_PLATFORMS, p)) ||
        !contentTypes.every((c: unknown) => isEnum(CONTENT_TYPE_VALUES, c)) ||
        !isEnum(TONE_VALUES, tone)
      ) {
        return NextResponse.json({ error: "Invalid platform, contentType or tone" }, { status: 400 });
      }
      const result = generateBatchContent({
        productTitle: String(productTitle).slice(0, 200),
        productDescription: typeof productDescription === "string" ? productDescription.slice(0, 2000) : "",
        productImage,
        platforms,
        contentTypes,
        tone,
        targetAudience: typeof targetAudience === "string" ? targetAudience.slice(0, 200) : "",
        count: Math.min(Math.max(Number(count) || 10, 1), 50),
      });
      for (const content of result.contents) {
        const id = await addSocialContent(uid, { ...content, saved: false });
        content.id = id || "";
      }
      return NextResponse.json({ success: true, result });
    }

    if (action === "ugc") {
      const { productTitle, productDescription, productImage, style, platform } = body;
      if (!productTitle || !style || !platform) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      if (!isEnum(UGC_STYLE_VALUES, style) || !isEnum(SOCIAL_PLATFORMS, platform)) {
        return NextResponse.json({ error: "Invalid style or platform" }, { status: 400 });
      }
      const ugc = generateUGCCreation({
        productTitle: String(productTitle).slice(0, 200),
        productDescription: typeof productDescription === "string" ? productDescription.slice(0, 2000) : "",
        productImage,
        style: style as UGCCreation["style"],
        platform: platform as SocialPlatform,
      });
      return NextResponse.json({ success: true, ugc });
    }

    if (action === "ideas") {
      const { productTitle, platform } = body;
      if (!productTitle || !platform) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      if (!isEnum(SOCIAL_PLATFORMS, platform)) {
        return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
      }
      const ideas = generateContentIdeas(String(productTitle).slice(0, 200), platform as SocialPlatform);
      return NextResponse.json({ success: true, ideas });
    }

    if (action === "save") {
      const { id, saved } = body;
      if (!id || typeof saved !== "boolean") {
        return NextResponse.json({ error: "id and saved (boolean) required" }, { status: 400 });
      }
      const ok = await updateSocialContent(uid, String(id), { saved });
      return NextResponse.json({ success: ok });
    }

    if (action === "schedule") {
      const { contentId, productTitle, platform, contentType, caption, hashtags, date, scheduledTime, status } = body;
      if (!productTitle || !platform || !contentType || !date) {
        return NextResponse.json({ error: "productTitle, platform, contentType and date are required" }, { status: 400 });
      }
      if (!isEnum(SOCIAL_PLATFORMS, platform) || !isEnum(CONTENT_TYPE_VALUES, contentType)) {
        return NextResponse.json({ error: "Invalid platform or contentType" }, { status: 400 });
      }
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      const id = await addCalendarEntry(uid, {
        date: parsedDate.toISOString().slice(0, 10),
        platform: platform as SocialPlatform,
        contentType: contentType as ContentType,
        ...(typeof contentId === "string" && contentId ? { contentId } : {}),
        productTitle: String(productTitle).slice(0, 200),
        caption: typeof caption === "string" ? caption.slice(0, 5000) : "",
        hashtags: Array.isArray(hashtags)
          ? hashtags.map((h: unknown) => String(h).slice(0, 50)).slice(0, 30)
          : [],
        ...(typeof scheduledTime === "string" && /^\d{2}:\d{2}$/.test(scheduledTime) ? { scheduledTime } : {}),
        status: status === "draft" ? "draft" : "scheduled",
      });
      return NextResponse.json({ success: !!id, id });
    }

    if (action === "calendar_status") {
      const { id, status } = body;
      if (!id || !isEnum(CALENDAR_STATUSES, status)) {
        return NextResponse.json({ error: "id and valid status required" }, { status: 400 });
      }
      const ok = await updateCalendarEntry(uid, String(id), {
        status: status as "draft" | "scheduled" | "posted" | "cancelled",
      });
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed") },
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

    if (type === "calendar") {
      const entries = await getCalendarEntries(uid);
      return NextResponse.json({ entries });
    }

    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const contents = await getSocialContent(uid, limit);
    return NextResponse.json({ contents });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed") },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const deleted = searchParams.get("type") === "calendar"
      ? await deleteCalendarEntry(uid, id)
      : await deleteSocialContent(uid, id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed") },
      { status: 500 }
    );
  }
});
