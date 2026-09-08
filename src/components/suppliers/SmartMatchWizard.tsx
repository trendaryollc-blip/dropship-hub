"use client";

import { useState } from "react";
import { Wand2, ChevronRight, ChevronLeft, Check, Loader2, Sparkles } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI, useMutation } from "@/hooks/useAPI";
import type { SupplierMatchResult, SupplierRecommendation, StoreProfile } from "@/types/supplier";

const STEPS = ["niche", "audience", "priorities", "results"];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
            i < currentStep ? "bg-accent text-white" : i === currentStep ? "bg-accent/20 text-accent border border-accent/30" : "bg-white/5 text-muted-foreground"
          }`}>
            {i < currentStep ? <Check className="h-3 w-3" /> : i + 1}
          </div>
          {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < currentStep ? "bg-accent" : "bg-white/10"}`} />}
        </div>
      ))}
    </div>
  );
}

function NicheStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const niches = ["Fashion", "Electronics", "Home & Garden", "Beauty", "Fitness", "Pet Supplies", "Baby Products", "Automotive"];
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Select your store niche</p>
      <div className="grid grid-cols-2 gap-2">
        {niches.map((niche) => (
          <button
            key={niche}
            onClick={() => onChange(niche)}
            className={`text-xs py-2.5 px-3 rounded-xl border transition-all ${
              value === niche ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            {niche}
          </button>
        ))}
      </div>
    </div>
  );
}

function AudienceStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Describe your target audience</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., Young professionals aged 25-35 interested in sustainable fashion..."
        className="w-full text-xs bg-white/5 border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground min-h-[100px] resize-none"
      />
    </div>
  );
}

function PrioritiesStep({ value, onChange }: { value: StoreProfile["priorities"]; onChange: (v: StoreProfile["priorities"]) => void }) {
  const priorities = [
    { key: "speed" as const, label: "Shipping Speed" },
    { key: "price" as const, label: "Price" },
    { key: "quality" as const, label: "Quality" },
    { key: "reliability" as const, label: "Reliability" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Set your priorities (0-100)</p>
      {priorities.map((p) => (
        <div key={p.key}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-foreground">{p.label}</span>
            <span className="text-[10px] font-medium text-accent">{value[p.key]}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={value[p.key]}
            onChange={(e) => onChange({ ...value, [p.key]: parseInt(e.target.value) })}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-accent"
          />
        </div>
      ))}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: SupplierRecommendation }) {
  const roleColors = {
    primary: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    backup: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    niche: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    seasonal: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  };

  return (
    <div className="glass rounded-xl p-3 border border-border">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">{rec.supplierName}</p>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border mt-1 ${roleColors[rec.role]}`}>
            {rec.role.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-muted-foreground">Match</p>
          <p className="text-sm font-bold text-accent">{rec.matchScore}%</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">{rec.reason}</p>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-muted-foreground">Est. Margin:</span>
        <span className="text-[9px] font-medium text-emerald-400">{rec.estimatedMargin.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function SmartMatchWizard() {
  const { ref, isInView } = useInView();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<StoreProfile>({
    niche: "",
    targetAudience: "",
    priceRange: { min: 5, max: 50 },
    monthlyVolume: 100,
    priorities: { speed: 50, price: 70, quality: 80, reliability: 90 },
  });

  const { trigger, data: result, isMutating } = useMutation<{ result: SupplierMatchResult }>("/api/suppliers/smart-match");
  const matchResult = result?.result;

  const canProceed = () => {
    if (currentStep === 0) return profile.niche !== "";
    if (currentStep === 1) return profile.targetAudience !== "";
    return true;
  };

  const handleMatch = async () => {
    await trigger({ body: profile });
    setCurrentStep(3);
  };

  return (
    <div ref={ref} className="glass rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Smart Supplier Match</h3>
      </div>

      <StepIndicator currentStep={currentStep} />

      <div className="min-h-[200px]">
        {currentStep === 0 && <NicheStep value={profile.niche} onChange={(v) => setProfile({ ...profile, niche: v })} />}
        {currentStep === 1 && <AudienceStep value={profile.targetAudience} onChange={(v) => setProfile({ ...profile, targetAudience: v })} />}
        {currentStep === 2 && <PrioritiesStep value={profile.priorities} onChange={(v) => setProfile({ ...profile, priorities: v })} />}
        {currentStep === 3 && (
          <div className="space-y-3">
            {isMutating ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-accent animate-spin" />
              </div>
            ) : matchResult?.recommendations ? (
              <>
                <div className="glass rounded-xl p-3 border border-accent/20 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <p className="text-xs font-semibold text-foreground">Portfolio Summary</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-[9px] text-muted-foreground">Suppliers</p>
                      <p className="text-xs font-medium text-foreground">{matchResult.portfolioSummary.totalSuppliers}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-[9px] text-muted-foreground">Avg Margin</p>
                      <p className="text-xs font-medium text-foreground">{matchResult.portfolioSummary.estimatedAvgMargin.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
                {matchResult.recommendations.map((rec) => (
                  <RecommendationCard key={rec.supplierId} rec={rec} />
                ))}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No results. Try matching again.</p>
            )}
          </div>
        )}
      </div>

      {currentStep < 3 && (
        <div className="flex items-center gap-2 mt-4">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3 w-3" /> Back
            </button>
          )}
          <button
            onClick={() => currentStep === 2 ? handleMatch() : setCurrentStep(currentStep + 1)}
            disabled={!canProceed() || isMutating}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50"
          >
            {currentStep === 2 ? (isMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Find Matches") : "Next"}
            {currentStep < 2 && <ChevronRight className="h-3 w-3" />}
          </button>
        </div>
      )}
    </div>
  );
}
