"use client";

import { type ReactNode } from "react";
import type { BentoLayout, BentoLayoutItem } from "./BentoLayoutPresets";

interface BentoGridProps {
  layout: BentoLayout;
  children: ReactNode;
  editMode?: boolean;
}

export default function BentoGrid({ layout, children, editMode = false }: BentoGridProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-[minmax(160px,auto)] ${
        editMode ? "ring-2 ring-accent/20 ring-offset-2 ring-offset-background rounded-3xl" : ""
      }`}
      data-bento-edit={editMode || undefined}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  item,
  children,
  editMode = false,
  onToggleVisibility,
}: {
  item: BentoLayoutItem;
  children: ReactNode;
  editMode?: boolean;
  onToggleVisibility?: (id: string) => void;
}) {
  const colSpanClasses = {
    1: "col-span-1",
    2: "col-span-1 sm:col-span-2",
    3: "col-span-1 sm:col-span-2 lg:col-span-3",
    4: "col-span-1 sm:col-span-2 lg:col-span-4",
  };

  const rowSpanClasses = {
    1: "row-span-1",
    2: "row-span-1 sm:row-span-2",
    3: "row-span-1 sm:row-span-2 lg:row-span-3",
  };

  if (!item.visible) return null;

  return (
    <div
      className={`${colSpanClasses[item.colSpan]} ${rowSpanClasses[item.rowSpan]} relative group overflow-hidden`}
      data-bento-item={item.id}
    >
      {editMode && (
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleVisibility?.(item.id)}
            className="bg-surface-elevated border border-border rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Hide
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
