"use client";

import Link from "next/link";
import {
  Zap, Award, Calculator, TrendingUp, Headphones, BarChart3, FileText,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { SectionDivider } from "./SectionDivider";

export function GrowthTools() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const tools = [
    { icon: Award, label: "Daily Missions", desc: "Challenges, XP, badges", href: "/missions", color: "from-amber-500/10 to-amber-600/5 border-amber-500/15", iconColor: "text-amber-400" },
    { icon: Calculator, label: "Calculator", desc: "Margins, pricing strategies", href: "/calculator", color: "from-green-500/10 to-green-600/5 border-green-500/15", iconColor: "text-green-400" },
    { icon: TrendingUp, label: "Trend Predictor", desc: "AI trend analysis", href: "/trends", color: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/15", iconColor: "text-cyan-400" },
    { icon: Headphones, label: "Customer Service", desc: "Support tickets, automation", href: "/customer-service", color: "from-violet-500/10 to-violet-600/5 border-violet-500/15", iconColor: "text-violet-400" },
    { icon: BarChart3, label: "Ad ROI", desc: "Ad performance, spend", href: "/ad-roi", color: "from-pink-500/10 to-pink-600/5 border-pink-500/15", iconColor: "text-pink-400" },
    { icon: FileText, label: "Daily Digest", desc: "Business summary", href: "/digest", color: "from-teal-500/10 to-teal-600/5 border-teal-500/15", iconColor: "text-teal-400" },
  ];
  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Growth & Tools" icon={Zap} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} aria-label={`Open ${tool.label}`}
            className={`group p-4 rounded-2xl bg-gradient-to-br ${tool.color} border hover:scale-[1.03] transition-all duration-500 text-center`}>
            <div className={`p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] inline-flex mb-2 ${tool.iconColor} group-hover:scale-110 transition-transform`}>
              <tool.icon className="h-5 w-5" />
            </div>
            <h3 className="text-[11px] font-semibold text-white mb-0.5">{tool.label}</h3>
            <p className="text-[9px] text-gray-500 leading-relaxed">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
