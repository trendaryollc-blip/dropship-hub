"use client";

import Link from "next/link";
import {
  Brain,
  Zap,
  DollarSign,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";

interface AIFeature {
  name: string;
  description: string;
  icon: typeof DollarSign;
  color: string;
  bgColor: string;
  href: string;
  hrefLabel: string;
}

interface FeaturesTabProps {
  aiFeatures: AIFeature[];
}

export default function FeaturesTab({ aiFeatures }: FeaturesTabProps) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass rounded-2xl p-5 border border-accent/10">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">AI-Powered Features</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Each feature below uses AI providers from the API Providers tab. Configure at least one provider to unlock these features. Click any feature to go to the page where it&apos;s used.
            </p>
          </div>
        </div>
      </div>

      {aiFeatures.map((feature) => (
        <Link key={feature.name} href={feature.href}
          className="glass rounded-2xl p-6 border border-border hover:border-accent/20 transition-all group block">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${feature.bgColor} shrink-0`}>
              <feature.icon className={`w-5 h-5 ${feature.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-foreground group-hover:text-accent transition-colors">{feature.name}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">{feature.hrefLabel}</span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
          </div>
        </Link>
      ))}

      <div className="glass rounded-2xl p-5 border border-purple-400/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-400/10">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Want AI-powered insights?</p>
              <p className="text-xs text-muted-foreground">Chat with the AI Assistant for personalized recommendations.</p>
            </div>
          </div>
          <Link href="/ai"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-400/10 border border-purple-400/20 text-xs font-medium text-purple-400 hover:bg-purple-400/20 transition-all shrink-0">
            Try AI <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
