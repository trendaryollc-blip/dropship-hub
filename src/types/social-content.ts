import { Timestamp } from "firebase/firestore";

// ── Content Types ────────────────────────────────────────────────────────────

export type SocialPlatform = "tiktok" | "instagram_reels" | "youtube_shorts" | "facebook_reels" | "pinterest_pins";
export type ContentType = "hook" | "caption" | "script" | "hashtag_set" | "ad_copy" | "ugc_script" | "story" | "carousel";
export type ContentTone = "urgent" | "casual" | "luxury" | "funny" | "educational" | "emotional" | "hype" | "relatable";
export type ContentLength = "short" | "medium" | "long";

// ── Generated Content ────────────────────────────────────────────────────────

export interface SocialContent {
  id: string;
  productTitle: string;
  productImage?: string;
  platform: SocialPlatform;
  contentType: ContentType;
  tone: ContentTone;
  content: string;
  hashtags: string[];
  audioSuggestion?: AudioSuggestion;
  cta: string;
  targetAudience: string;
  performanceNotes: string;
  saved: boolean;
  usedAt?: string;
  createdAt: string;
}

export interface AudioSuggestion {
  name: string;
  artist: string;
  trending: boolean;
  platform: SocialPlatform;
  usageCount: number;
  url?: string;
}

// ── Content Calendar ─────────────────────────────────────────────────────────

export interface ContentCalendarEntry {
  id: string;
  date: string;
  platform: SocialPlatform;
  contentType: ContentType;
  contentId?: string;
  productTitle: string;
  caption: string;
  hashtags: string[];
  scheduledTime?: string;
  status: "draft" | "scheduled" | "posted" | "cancelled";
  performance?: ContentPerformance;
  notes?: string;
  createdAt: string;
}

export interface ContentPerformance {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  engagementRate: number;
  clickThrough: number;
  conversions: number;
  revenue: number;
}

// ── UGC Creator ──────────────────────────────────────────────────────────────

export interface UGCCreation {
  id: string;
  productTitle: string;
  productImage?: string;
  productDescription: string;
  style: "unboxing" | "review" | "tutorial" | "before_after" | "lifestyle" | "comparison" | "problem_solution";
  platform: SocialPlatform;
  script: string;
  hookOptions: string[];
  shotList: ShotItem[];
  duration: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedViews?: number;
  saved: boolean;
  createdAt: string;
}

export interface ShotItem {
  order: number;
  description: string;
  duration: string;
  cameraAngle: string;
  notes: string;
}

// ── Trending Audio ───────────────────────────────────────────────────────────

export interface TrendingAudio {
  id: string;
  name: string;
  artist: string;
  platform: SocialPlatform;
  usageCount: number;
  trendDirection: "rising" | "peak" | "declining";
  category: string;
  url?: string;
  fetchedAt: string;
}

// ── Content Ideas ────────────────────────────────────────────────────────────

export interface ContentIdea {
  id: string;
  productTitle: string;
  platform: SocialPlatform;
  ideaType: "hook" | "angle" | "story" | "series" | "challenge" | "duet" | "stitch";
  title: string;
  description: string;
  estimatedEngagement: "low" | "medium" | "high" | "viral";
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  saved: boolean;
  createdAt: string;
}

// ── Content Templates ────────────────────────────────────────────────────────

export interface ContentTemplate {
  id: string;
  name: string;
  platform: SocialPlatform;
  contentType: ContentType;
  tone: ContentTone;
  template: string;
  variables: string[];
  example: string;
  performance?: "high" | "medium" | "low";
  category: string;
}

// ── Batch Generation ─────────────────────────────────────────────────────────

export interface BatchGenerationRequest {
  productTitle: string;
  productDescription: string;
  productImage?: string;
  platforms: SocialPlatform[];
  contentTypes: ContentType[];
  tone: ContentTone;
  targetAudience: string;
  count: number;
}

export interface BatchGenerationResult {
  contents: SocialContent[];
  totalGenerated: number;
  platformBreakdown: Record<SocialPlatform, number>;
}

// ── Stats ────────────────────────────────────────────────────────────────────

export interface ContentStats {
  totalGenerated: number;
  totalSaved: number;
  platformBreakdown: Record<SocialPlatform, number>;
  contentTypeBreakdown: Record<ContentType, number>;
  topPerformingPlatform: SocialPlatform;
  avgEngagementRate: number;
  calendarEntries: number;
  scheduledPosts: number;
}

// ── Firestore Doc ────────────────────────────────────────────────────────────

export interface SocialContentDoc {
  id: string;
  productTitle: string;
  productImage?: string;
  platform: SocialPlatform;
  contentType: ContentType;
  tone: ContentTone;
  content: string;
  hashtags: string[];
  cta: string;
  saved: boolean;
  usedAt?: string;
  createdAt: Timestamp;
}
