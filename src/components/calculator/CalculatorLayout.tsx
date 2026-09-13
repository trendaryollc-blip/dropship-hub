"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

interface CalculatorLayoutProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  children: ReactNode;
  actions?: ReactNode;
}

export default function CalculatorLayout({
  title,
  description,
  breadcrumbs,
  children,
  actions,
}: CalculatorLayoutProps) {
  const items = breadcrumbs || [
    { label: "Calculator", href: "/calculator" },
    { label: title },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/calculator"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Breadcrumbs items={items} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
              <Calculator className="h-6 w-6 text-accent" />
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}
