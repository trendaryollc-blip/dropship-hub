"use client";

import { type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import type { BentoSpan, BentoRowSpan } from "./BentoLayoutPresets";

interface BentoCardProps {
  id: string;
  colSpan: BentoSpan;
  rowSpan: BentoRowSpan;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

const colSpanClasses: Record<BentoSpan, string> = {
  1: "col-span-1",
  2: "col-span-1 sm:col-span-2",
  3: "col-span-1 sm:col-span-2 lg:col-span-3",
  4: "col-span-1 sm:col-span-2 lg:col-span-4",
};

const rowSpanClasses: Record<BentoRowSpan, string> = {
  1: "row-span-1",
  2: "row-span-1 sm:row-span-2",
  3: "row-span-1 sm:row-span-2 lg:row-span-3",
};

export default function BentoCard({
  id,
  colSpan,
  rowSpan,
  title,
  icon,
  action,
  className = "",
  children,
}: BentoCardProps) {
  const { ref, isInView } = useInView({ threshold: 0.05 });

  return (
    <div
      ref={ref}
      data-bento-id={id}
      className={`surface-raised rounded-2xl overflow-hidden transition-all duration-500 ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${colSpanClasses[colSpan]} ${rowSpanClasses[rowSpan]} ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {title && (
            <div className="flex items-center gap-2">
              {icon}
              <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
            </div>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}
