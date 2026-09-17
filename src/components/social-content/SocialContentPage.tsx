"use client";

import { useState, useCallback } from "react";
import {
  Share2,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Save,
  Trash2,
  Calendar,
  Lightbulb,
  Video,
  Megaphone,
  ChevronDown,
  Wand2,
  FileText,
  Hash,
  MessageSquare,
  Layers,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import type {
  SocialPlatform,
  ContentType,
  ContentTone,
  SocialContent,
  UGCCreation,
  ContentIdea,
  ContentStats,
} from "@/types/social-content";

const PLATFORMS: { id: SocialPlatform; label: string; icon: string; color: string }[] = [
  { id: "tiktok", label: "TikTok", icon: "♪", color: "text-pink-400" },
  { id: "instagram_reels", label: "Instagram Reels", icon: "◎", color: "text-purple-400" },
  { id: "youtube_shorts", label: "YouTube Shorts", icon: "▶", color: "text-red-400" },
  { id: "facebook_reels", label: "Facebook Reels", icon: "f", color: "text-blue-400" },
  { id: "pinterest_pins", label: "Pinterest Pins", icon: "P", color: "text-rose-400" },
];

const CONTENT_TYPES: { id: ContentType; label: string; icon: any; desc: string }[] = [
  { id: "hook", label: "Hook", icon: Zap, desc: "Scroll-stopping opening lines" },
  { id: "caption", label: "Caption", icon: MessageSquare, desc: "Full post captions" },
  { id: "script", label: "Video Script", icon: FileText, desc: "Complete video scripts" },
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

function Zap(props: any) {
  return <Sparkles {...props} />;
}

export default function SocialContentPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "ugc" | "ideas" | "library" | "calendar">("generate");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SocialContent | null>(null);
  const [ugcResult, setUgcResult] = useState<UGCCreation | null>(null);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const { data: statsData, mutate: mutateStats } = useAPI<{ stats: ContentStats }>("/api/social-content?type=stats");
  const { data: libraryData, mutate: mutateLibrary } = useAPI<{ contents: SocialContent[] }>("/api/social-content?type=list");

  // Form state
  const [productTitle, setProductTitle] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productImage, setProductImage] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform>("tiktok");
  const [contentType, setContentType] = useState<ContentType>("hook");
  const [tone, setTone] = useState<ContentTone>("urgent");
  const [targetAudience, setTargetAudience] = useState("");
  const [ugcStyle, setUgcStyle] = useState<UGCCreation["style"]>("unboxing");

  const handleGenerate = useCallback(async () => {
    if (!productTitle.trim()) return;
    setLoading(true);
    setResult(null);
    setUgcResult(null);
    setIdeas([]);
    try {
      const res = await fetch("/api/social-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", productTitle, productImage, platform, contentType, tone, targetAudience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.content);
      success("Content generated");
      mutateStats();
      mutateLibrary();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed");
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
      const res = await fetch("/api/social-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ugc", productTitle, productDescription, productImage, style: ugcStyle, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUgcResult(data.ugc);
      success("UGC script generated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed");
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
      const res = await fetch("/api/social-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ideas", productTitle, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIdeas(data.ideas);
      success("Ideas generated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [productTitle, platform, success, showError]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const stats = statsData?.stats;
  const library = libraryData?.contents || [];

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
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Generated", value: stats.totalGenerated, icon: Sparkles },
            { label: "Saved", value: stats.totalSaved, icon: Save },
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
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Name *</label>
              <input
                type="text"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
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
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Audience</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
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
                  <p className="text-xs text-muted-foreground">{result.audioSuggestion.usageCount.toLocaleString()} uses {result.audioSuggestion.trending ? "• Trending" : ""}</p>
                </div>
              )}

              {/* CTA */}
              <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
                <p className="text-xs text-muted-foreground mb-1">Call to Action</p>
                <p className="text-sm font-medium text-accent">{result.cta}</p>
              </div>

              <div className="flex gap-2">
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
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "ugc" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Name *</label>
              <input type="text" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} placeholder="e.g. Wireless Bluetooth Earbuds"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Description</label>
              <textarea value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Describe the product..." rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">UGC Style</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {UGC_STYLES.map((s) => (
                  <button key={s.id} onClick={() => setUgcStyle(s.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${ugcStyle === s.id ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>
                    <span className="text-lg">{s.icon}</span>
                    <span className="font-medium">{s.label}</span>
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

          {ugcResult && (
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-foreground">UGC Script — {ugcResult.style}</h3>
                <span className="text-xs text-muted-foreground">{ugcResult.duration} • {ugcResult.difficulty}</span>
              </div>
              <div className="p-4 rounded-xl bg-surface/50 border border-border/50">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{ugcResult.script}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Hook Options</p>
                <div className="space-y-1.5">
                  {ugcResult.hookOptions.map((hook, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-surface/50 border border-border/30">
                      <span className="text-sm text-foreground">{hook}</span>
                      <button onClick={() => handleCopy(hook, `hook-${i}`)} className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground">
                        {copied === `hook-${i}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
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
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Name *</label>
                <input type="text" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} placeholder="e.g. Wireless Bluetooth Earbuds"
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Platform</label>
                <div className="flex gap-1.5">
                  {PLATFORMS.map((p) => (
                    <button key={p.id} onClick={() => setPlatform(p.id)}
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

          {ideas.length > 0 && (
            <div className="space-y-2">
              {ideas.map((idea) => (
                <div key={idea.id} className="glass rounded-xl p-4 flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-accent/10 text-accent font-medium">{idea.ideaType}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                        idea.estimatedEngagement === "viral" ? "bg-red-500/10 text-red-400" :
                        idea.estimatedEngagement === "high" ? "bg-emerald-500/10 text-emerald-400" :
                        "bg-surface text-muted-foreground"
                      }`}>{idea.estimatedEngagement} engagement</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{idea.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{idea.description}</p>
                    <div className="flex gap-1 mt-1.5">
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
          {library.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No content generated yet</p>
            </div>
          ) : (
            library.map((item) => (
              <div key={item.id} className="glass rounded-xl p-4 hover:border-accent/10 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">{PLATFORMS.find(p => p.id === item.platform)?.label}</span>
                      <span className="text-xs text-muted-foreground">{item.contentType}</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-3">{item.content}</p>
                    <div className="flex gap-1 mt-1.5">
                      {item.hashtags.slice(0, 5).map((tag, i) => (
                        <span key={i} className="text-[10px] text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={() => handleCopy(item.content, item.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all opacity-0 group-hover:opacity-100">
                      {copied === item.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={async () => { await fetch(`/api/social-content?id=${item.id}`, { method: "DELETE" }); mutateLibrary(); mutateStats(); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
