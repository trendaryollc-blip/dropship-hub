"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Share2,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Calendar,
  CalendarPlus,
  Lightbulb,
  Video,
  Megaphone,
  Wand2,
  FileText,
  Hash,
  MessageSquare,
  Layers,
  BookOpen,
  TrendingUp,
  Zap,
  Star,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import { authJson } from "@/lib/auth-headers";
import { copyToClipboard } from "@/lib/clipboard";
import type {
  SocialPlatform,
  ContentType,
  ContentTone,
  SocialContent,
  UGCCreation,
  ContentIdea,
  ContentStats,
  ContentCalendarEntry,
} from "@/types/social-content";

const PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram_reels", label: "Instagram Reels" },
  { id: "youtube_shorts", label: "YouTube Shorts" },
  { id: "facebook_reels", label: "Facebook Reels" },
  { id: "pinterest_pins", label: "Pinterest Pins" },
];

const CONTENT_TYPES: { id: ContentType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: "hook", label: "Hook", icon: Zap, desc: "Scroll-stopping opening lines" },
  { id: "caption", label: "Caption", icon: MessageSquare, desc: "Full post captions" },
  { id: "script", label: "Video Script", icon: FileText, desc: "Complete video scripts" },
  { id: "story", label: "Story", icon: Clock, desc: "Story-format content" },
  { id: "hashtag_set", label: "Hashtags", icon: Hash, desc: "Optimized hashtag sets" },
  { id: "ad_copy", label: "Ad Copy", icon: Megaphone, desc: "Paid ad copy variations" },
  { id: "ugc_script", label: "UGC Script", icon: Video, desc: "User-generated content scripts" },
  { id: "carousel", label: "Carousel", icon: Layers, desc: "Carousel post content" },
];

const TONES: { id: ContentTone; label: string; emoji: string }[] = [
  { id: "urgent", label: "Urgent", emoji: "🔥" },
  { id: "casual", label: "Casual", emoji: "😎" },
  { id: "luxury", label: "Luxury", emoji: "✨" },
  { id: "funny", label: "Funny", emoji: "😂" },
  { id: "educational", label: "Educational", emoji: "📚" },
  { id: "emotional", label: "Emotional", emoji: "💫" },
  { id: "hype", label: "Hype", emoji: "🚀" },
  { id: "relatable", label: "Relatable", emoji: "🤝" },
];

const UGC_STYLES = [
  { id: "unboxing" as const, label: "Unboxing", icon: "📦" },
  { id: "review" as const, label: "Honest Review", icon: "⭐" },
  { id: "tutorial" as const, label: "Tutorial", icon: "📖" },
  { id: "before_after" as const, label: "Before/After", icon: "🔄" },
  { id: "lifestyle" as const, label: "Lifestyle", icon: "🌟" },
  { id: "comparison" as const, label: "Comparison", icon: "⚖️" },
  { id: "problem_solution" as const, label: "Problem → Solution", icon: "💡" },
];

const STATUS_BADGES: Record<ContentCalendarEntry["status"], string> = {
  draft: "bg-surface text-muted-foreground",
  scheduled: "bg-blue-500/10 text-blue-400",
  posted: "bg-emerald-500/10 text-emerald-400",
  cancelled: "bg-red-500/10 text-red-400",
};

function fmtDate(date: string): string {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function DataState({
  isLoading,
  error,
  label,
  onRetry,
}: {
  isLoading: boolean;
  error: unknown;
  label: string;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto" />
        <p className="text-sm text-muted-foreground mt-2">Loading {label}…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-center border border-red-500/20">
        <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-foreground">Couldn&apos;t load {label}.</p>
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }
  return null;
}

export default function SocialContentPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "ugc" | "ideas" | "library" | "calendar">("generate");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SocialContent | null>(null);
  const [ugcResult, setUgcResult] = useState<UGCCreation | null>(null);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { success, error: showError } = useToast();
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const { data: statsData, mutate: mutateStats } = useAPI<{ stats: ContentStats }>("/api/social-content?type=stats");
  const {
    data: libraryData,
    mutate: mutateLibrary,
    isLoading: libraryLoading,
    error: libraryError,
  } = useAPI<{ contents: SocialContent[] }>("/api/social-content?type=list");
  const {
    data: calendarData,
    mutate: mutateCalendar,
    isLoading: calendarLoading,
    error: calendarError,
  } = useAPI<{ entries: ContentCalendarEntry[] }>("/api/social-content?type=calendar");

  // Form state
  const [productTitle, setProductTitle] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productImage, setProductImage] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform>("tiktok");
  const [contentType, setContentType] = useState<ContentType>("hook");
  const [tone, setTone] = useState<ContentTone>("urgent");
  const [targetAudience, setTargetAudience] = useState("");
  const [ugcStyle, setUgcStyle] = useState<UGCCreation["style"]>("unboxing");

  // Calendar form state
  const [calTitle, setCalTitle] = useState("");
  const [calCaption, setCalCaption] = useState("");
  const [calPlatform, setCalPlatform] = useState<SocialPlatform>("tiktok");
  const [calContentType, setCalContentType] = useState<ContentType>("caption");
  const [calDate, setCalDate] = useState("");
  const [calTime, setCalTime] = useState("");
  const [calContentId, setCalContentId] = useState("");
  const [calHashtags, setCalHashtags] = useState<string[]>([]);
  const [scheduling, setScheduling] = useState(false);

  const stats = statsData?.stats;
  const library = libraryData?.contents || [];
  const calendarEntries = [...(calendarData?.entries || [])].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.scheduledTime || "").localeCompare(b.scheduledTime || "")
  );

  const handleGenerate = useCallback(async () => {
    if (!productTitle.trim()) return;
    setLoading(true);
    setResult(null);
    setUgcResult(null);
    setIdeas([]);
    try {
      const data = await authJson<{ content: SocialContent }>("/api/social-content", {
        action: "generate",
        productTitle,
        productImage,
        platform,
        contentType,
        tone,
        targetAudience,
      });
      setResult(data.content);
      success("Content generated");
      mutateStats();
      mutateLibrary();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to generate content");
    } finally {
      setLoading(false);
    }
  }, [productTitle, productImage, platform, contentType, tone, targetAudience, success, showError, mutateStats, mutateLibrary]);

  const handleGenerateUGC = useCallback(async () => {
    if (!productTitle.trim()) return;
    setLoading(true);
    setResult(null);
    setUgcResult(null);
    setIdeas([]);
    try {
      const data = await authJson<{ ugc: UGCCreation }>("/api/social-content", {
        action: "ugc",
        productTitle,
        productDescription,
        productImage,
        style: ugcStyle,
        platform,
      });
      setUgcResult(data.ugc);
      success("UGC script generated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to generate UGC script");
    } finally {
      setLoading(false);
    }
  }, [productTitle, productDescription, productImage, ugcStyle, platform, success, showError]);

  const handleGenerateIdeas = useCallback(async () => {
    if (!productTitle.trim()) return;
    setLoading(true);
    setResult(null);
    setUgcResult(null);
    setIdeas([]);
    try {
      const data = await authJson<{ ideas: ContentIdea[] }>("/api/social-content", {
        action: "ideas",
        productTitle,
        platform,
      });
      setIdeas(data.ideas || []);
      success("Ideas generated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to generate ideas");
    } finally {
      setLoading(false);
    }
  }, [productTitle, platform, success, showError]);

  const handleCopy = useCallback(
    async (text: string, id: string) => {
      const ok = await copyToClipboard(text);
      if (!ok) {
        showError("Couldn't copy to clipboard");
        return;
      }
      setCopied(id);
      success("Copied to clipboard");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 2000);
    },
    [success, showError]
  );

  const handleToggleSave = useCallback(
    async (item: SocialContent) => {
      setSavingId(item.id);
      try {
        const data = await authJson<{ success: boolean }>("/api/social-content", {
          action: "save",
          id: item.id,
          saved: !item.saved,
        });
        if (!data.success) throw new Error("Failed to update");
        mutateStats();
        mutateLibrary();
        success(item.saved ? "Removed from saved" : "Saved to favorites");
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to update");
      } finally {
        setSavingId(null);
      }
    },
    [success, showError, mutateStats, mutateLibrary]
  );

  const handleDeleteLibrary = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await authJson(`/api/social-content?id=${encodeURIComponent(id)}`, undefined, "DELETE");
        success("Content deleted");
        mutateLibrary();
        mutateStats();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setDeletingId(null);
      }
    },
    [success, showError, mutateLibrary, mutateStats]
  );

  const fillCalendarForm = useCallback(
    (item: Pick<SocialContent, "id" | "productTitle" | "platform" | "contentType" | "content" | "hashtags">) => {
      setCalTitle(item.productTitle);
      setCalCaption(item.content);
      setCalPlatform(item.platform);
      setCalContentType(item.contentType);
      setCalContentId(item.id);
      setCalHashtags(item.hashtags || []);
      setActiveTab("calendar");
    },
    []
  );

  const handleSchedule = useCallback(async () => {
    if (!calTitle.trim() || !calDate) return;
    setScheduling(true);
    try {
      const data = await authJson<{ success: boolean }>("/api/social-content", {
        action: "schedule",
        productTitle: calTitle.trim(),
        platform: calPlatform,
        contentType: calContentType,
        caption: calCaption,
        hashtags: calHashtags,
        date: calDate,
        ...(calTime ? { scheduledTime: calTime } : {}),
        ...(calContentId ? { contentId: calContentId } : {}),
        status: "scheduled",
      });
      if (!data.success) throw new Error("Failed to schedule post");
      success("Post scheduled");
      mutateCalendar();
      mutateStats();
      setCalDate("");
      setCalTime("");
      setCalContentId("");
      setCalHashtags([]);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to schedule post");
    } finally {
      setScheduling(false);
    }
  }, [calTitle, calDate, calPlatform, calContentType, calCaption, calHashtags, calTime, calContentId, success, showError, mutateCalendar, mutateStats]);

  const handleCalendarStatus = useCallback(
    async (id: string, status: ContentCalendarEntry["status"]) => {
      try {
        const data = await authJson<{ success: boolean }>("/api/social-content", {
          action: "calendar_status",
          id,
          status,
        });
        if (!data.success) throw new Error("Failed to update status");
        success(status === "posted" ? "Marked as posted" : "Post cancelled");
        mutateCalendar();
        mutateStats();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to update status");
      }
    },
    [success, showError, mutateCalendar, mutateStats]
  );

  const handleDeleteCalendarEntry = useCallback(
    async (id: string) => {
      try {
        await authJson(`/api/social-content?type=calendar&id=${encodeURIComponent(id)}`, undefined, "DELETE");
        success("Scheduled post deleted");
        mutateCalendar();
        mutateStats();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [success, showError, mutateCalendar, mutateStats]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Share2 className="h-6 w-6 text-accent" />
            Content Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate hooks, captions, scripts, and UGC content for social media.
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Generated", value: stats.totalGenerated, icon: Sparkles },
            { label: "Saved", value: stats.totalSaved, icon: Star },
            { label: "Calendar", value: stats.calendarEntries, icon: Calendar },
            { label: "Scheduled", value: stats.scheduledPosts, icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground uppercase">{s.label}</span>
                <s.icon className="h-3 w-3 text-accent" />
              </div>
              <div className="font-display text-lg font-bold text-foreground">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "generate" as const, label: "Generate", icon: Wand2 },
          { id: "ugc" as const, label: "UGC Scripts", icon: Video },
          { id: "ideas" as const, label: "Content Ideas", icon: Lightbulb },
          { id: "library" as const, label: "Library", icon: BookOpen },
          { id: "calendar" as const, label: "Calendar", icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-accent/10 text-accent border border-accent/20"
                : "bg-surface border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "generate" && (
        <div className="space-y-4">
          {/* Input Form */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <div>
              <label htmlFor="sc-product-title" className="block text-xs font-medium text-muted-foreground mb-1.5">Product Name *</label>
              <input
                id="sc-product-title"
                type="text"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                maxLength={200}
                placeholder="e.g. Wireless Bluetooth Earbuds"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>

            {/* Platform + Type + Tone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Platform</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      aria-pressed={platform === p.id}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        platform === p.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Content Type</label>
                <div className="space-y-1">
                  {CONTENT_TYPES.map((ct) => (
                    <button
                      key={ct.id}
                      onClick={() => setContentType(ct.id)}
                      title={ct.desc}
                      aria-pressed={contentType === ct.id}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                        contentType === ct.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ct.icon className="h-3 w-3 shrink-0" />
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tone</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      aria-pressed={tone === t.id}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tone === t.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="sc-audience" className="block text-xs font-medium text-muted-foreground mb-1.5">Target Audience</label>
              <input
                id="sc-audience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                maxLength={200}
                placeholder="e.g. fitness enthusiasts, pet owners, gamers"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!productTitle.trim() || loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Content
            </button>
          </div>

          {/* Result */}
          {loading && (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Generating content...</p>
            </div>
          )}

          {result && (
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Generated Content
                </h3>
                <span className="text-xs text-muted-foreground">{PLATFORMS.find(p => p.id === result.platform)?.label} • {result.contentType}</span>
              </div>

              <div className="p-4 rounded-xl bg-surface/50 border border-border/50">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result.content}</p>
              </div>

              {/* Hashtags */}
              <div className="flex flex-wrap gap-1.5">
                {result.hashtags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-xs">{tag}</span>
                ))}
              </div>

              {/* Audio Suggestion */}
              {result.audioSuggestion && (
                <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">🎵 Suggested Audio</p>
                  <p className="text-sm font-medium text-foreground">{result.audioSuggestion.name} — {result.audioSuggestion.artist}</p>
                  <p className="text-xs text-muted-foreground">Suggested audio — verify trend on the platform before use</p>
                </div>
              )}

              {/* CTA */}
              <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
                <p className="text-xs text-muted-foreground mb-1">Call to Action</p>
                <p className="text-sm font-medium text-accent">{result.cta}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCopy(result.content, "content")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
                >
                  {copied === "content" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied === "content" ? "Copied!" : "Copy Content"}
                </button>
                <button
                  onClick={() => handleCopy(result.hashtags.join(" "), "hashtags")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
                >
                  {copied === "hashtags" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied === "hashtags" ? "Copied!" : "Copy Hashtags"}
                </button>
                <button
                  onClick={() => fillCalendarForm(result)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Add to Calendar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "ugc" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div>
              <label htmlFor="sc-ugc-title" className="block text-xs font-medium text-muted-foreground mb-1.5">Product Name *</label>
              <input id="sc-ugc-title" type="text" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} maxLength={200} placeholder="e.g. Wireless Bluetooth Earbuds"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <div>
              <label htmlFor="sc-ugc-desc" className="block text-xs font-medium text-muted-foreground mb-1.5">Product Description</label>
              <textarea id="sc-ugc-desc" rows={3} value={productDescription} onChange={(e) => setProductDescription(e.target.value)} maxLength={2000} placeholder="What does it do? Key features and benefits..."
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <div>
              <label htmlFor="sc-ugc-image" className="block text-xs font-medium text-muted-foreground mb-1.5">Product Image URL</label>
              <input id="sc-ugc-image" type="url" value={productImage} onChange={(e) => setProductImage(e.target.value)} maxLength={500} placeholder="https://example.com/product.jpg"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Platform</label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <button key={p.id} onClick={() => setPlatform(p.id)} aria-pressed={platform === p.id}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${platform === p.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                    {p.label.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">UGC Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {UGC_STYLES.map((s) => (
                  <button key={s.id} onClick={() => setUgcStyle(s.id)} aria-pressed={ugcStyle === s.id}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${ugcStyle === s.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                    <span aria-hidden="true">{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleGenerateUGC} disabled={!productTitle.trim() || loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Generate UGC Script
            </button>
          </div>

          {loading && (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Generating UGC script...</p>
            </div>
          )}

          {ugcResult && (
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                  <Video className="h-4 w-4 text-accent" />
                  UGC Script
                </h3>
                <span className="text-xs text-muted-foreground">{PLATFORMS.find(p => p.id === ugcResult.platform)?.label} • {ugcResult.duration} • {ugcResult.difficulty}</span>
              </div>
              <div className="p-4 rounded-xl bg-surface/50 border border-border/50">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{ugcResult.script}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Hook Options</p>
                <div className="space-y-1.5">
                  {ugcResult.hookOptions.map((hook, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-surface/50 border border-border/30">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <p className="text-sm text-foreground">{hook}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Shot List</p>
                <div className="space-y-1.5">
                  {ugcResult.shotList.map((shot) => (
                    <div key={shot.order} className="flex items-start gap-3 p-2.5 rounded-lg bg-surface/50 border border-border/30">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center font-bold">{shot.order}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{shot.description}</p>
                        <p className="text-xs text-muted-foreground">{shot.duration} • {shot.cameraAngle} • {shot.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => handleCopy(ugcResult.script, "ugc-script")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all">
                {copied === "ugc-script" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied === "ugc-script" ? "Copied!" : "Copy Script"}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "ideas" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sc-ideas-title" className="block text-xs font-medium text-muted-foreground mb-1.5">Product Name *</label>
                <input id="sc-ideas-title" type="text" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} maxLength={200} placeholder="e.g. Wireless Bluetooth Earbuds"
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Platform</label>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.map((p) => (
                    <button key={p.id} onClick={() => setPlatform(p.id)} aria-pressed={platform === p.id}
                      className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${platform === p.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                      {p.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleGenerateIdeas} disabled={!productTitle.trim() || loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
              Generate Ideas
            </button>
          </div>

          {loading && (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Generating ideas...</p>
            </div>
          )}

          {!loading && ideas.length > 0 && (
            <div className="space-y-2">
              {ideas.map((idea) => (
                <div key={idea.id} className="glass rounded-xl p-4 flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-accent/10 text-accent font-medium">{idea.ideaType}</span>
                      <span className="text-xs px-2 py-0.5 rounded-lg font-medium bg-surface text-muted-foreground">
                        Suggested potential: {idea.estimatedEngagement} (unvalidated)
                      </span>
                      <span className="text-xs text-muted-foreground">{idea.difficulty}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{idea.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{idea.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {idea.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "library" && (
        <div className="space-y-2">
          <DataState isLoading={libraryLoading} error={libraryError} label="your content library" onRetry={() => mutateLibrary()} />
          {!libraryLoading && !libraryError && library.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No content generated yet</p>
            </div>
          )}
          {!libraryLoading && !libraryError && library.map((item) => (
            <div key={item.id} className="glass rounded-xl p-4 hover:border-accent/10 transition-all group">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">{PLATFORMS.find(p => p.id === item.platform)?.label}</span>
                    <span className="text-xs text-muted-foreground">{item.contentType}</span>
                    {item.saved && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5" /> Saved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground line-clamp-3">{item.content}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.hashtags.slice(0, 5).map((tag, i) => (
                      <span key={i} className="text-[10px] text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggleSave(item)}
                    disabled={savingId === item.id}
                    aria-label={item.saved ? "Remove from saved" : "Save to favorites"}
                    title={item.saved ? "Remove from saved" : "Save to favorites"}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                  >
                    {savingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className={`h-3.5 w-3.5 ${item.saved ? "fill-amber-400 text-amber-400" : ""}`} />}
                  </button>
                  <button
                    onClick={() => fillCalendarForm(item)}
                    aria-label="Schedule this content"
                    title="Schedule this content"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleCopy(item.content, item.id)}
                    aria-label="Copy content"
                    title="Copy content"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
                  >
                    {copied === item.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDeleteLibrary(item.id)}
                    disabled={deletingId === item.id}
                    aria-label="Delete content"
                    title="Delete content"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                  >
                    {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="space-y-4">
          {/* Schedule form */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              Schedule a Post
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sc-cal-title" className="block text-xs font-medium text-muted-foreground mb-1.5">Product Name *</label>
                <input id="sc-cal-title" type="text" value={calTitle} onChange={(e) => setCalTitle(e.target.value)} maxLength={200} placeholder="e.g. Wireless Bluetooth Earbuds"
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
              </div>
              <div>
                <label htmlFor="sc-cal-date" className="block text-xs font-medium text-muted-foreground mb-1.5">Publish Date *</label>
                <div className="flex gap-2">
                  <input id="sc-cal-date" type="date" value={calDate} onChange={(e) => setCalDate(e.target.value)} required
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
                  <input type="time" value={calTime} onChange={(e) => setCalTime(e.target.value)} aria-label="Publish time (optional)"
                    className="w-32 px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Platform</label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <button key={p.id} onClick={() => setCalPlatform(p.id)} aria-pressed={calPlatform === p.id}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${calPlatform === p.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                    {p.label.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Content Type</label>
              <div className="flex flex-wrap gap-1.5">
                {CONTENT_TYPES.map((ct) => (
                  <button key={ct.id} onClick={() => setCalContentType(ct.id)} aria-pressed={calContentType === ct.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${calContentType === ct.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                    <ct.icon className="h-3 w-3 shrink-0" />
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="sc-cal-caption" className="block text-xs font-medium text-muted-foreground mb-1.5">Caption</label>
              <textarea id="sc-cal-caption" rows={3} value={calCaption} onChange={(e) => setCalCaption(e.target.value)} maxLength={5000} placeholder="Post caption — click 'Add to Calendar' on generated content or a library item to prefill this."
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <button onClick={handleSchedule} disabled={!calTitle.trim() || !calDate || scheduling}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50">
              {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
              Schedule Post
            </button>
          </div>

          <DataState isLoading={calendarLoading} error={calendarError} label="your content calendar" onRetry={() => mutateCalendar()} />

          {/* Scheduled entries */}
          {!calendarLoading && !calendarError && calendarEntries.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nothing scheduled yet</p>
            </div>
          )}
          {!calendarLoading && !calendarError && calendarEntries.map((entry) => (
            <div key={entry.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">{fmtDate(entry.date)}</span>
                    {entry.scheduledTime && (
                      <span className="text-xs px-2 py-0.5 rounded bg-surface text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {entry.scheduledTime}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{PLATFORMS.find(p => p.id === entry.platform)?.label} • {entry.contentType}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_BADGES[entry.status]}`}>{entry.status}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">{entry.productTitle}</h4>
                  {entry.caption && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.caption}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {entry.status !== "posted" && entry.status !== "cancelled" && (
                    <button
                      onClick={() => handleCalendarStatus(entry.id, "posted")}
                      aria-label="Mark as posted"
                      title="Mark as posted"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {entry.status === "scheduled" && (
                    <button
                      onClick={() => handleCalendarStatus(entry.id, "cancelled")}
                      aria-label="Cancel post"
                      title="Cancel post"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCalendarEntry(entry.id)}
                    aria-label="Delete scheduled post"
                    title="Delete scheduled post"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

