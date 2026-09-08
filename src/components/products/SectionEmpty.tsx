"use client";

import type { LucideIcon } from "lucide-react";

interface SectionEmptyProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  iconColor?: string;
}

export default function SectionEmpty({ icon: Icon, title, description, iconColor = "text-muted-foreground/20" }: SectionEmptyProps) {
  return (
    <div className="p-8 text-center">
      <Icon className={`h-8 w-8 ${iconColor} mx-auto mb-2`} />
      <p className="text-xs text-muted-foreground">{title}</p>
      {description && <p className="text-[10px] text-muted-foreground/60 mt-1">{description}</p>}
    </div>
  );
}
