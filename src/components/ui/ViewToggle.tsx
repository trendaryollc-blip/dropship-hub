"use client";

import { LayoutGrid, List } from "lucide-react";

export default function ViewToggle({ viewMode, setViewMode }: { viewMode: "grid" | "list"; setViewMode: (v: "grid" | "list") => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-border">
      <button
        onClick={() => setViewMode("grid")}
        className={`p-2.5 rounded-md transition-all min-w-[36px] min-h-[36px] flex items-center justify-center ${viewMode === "grid" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"}`}
        title="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => setViewMode("list")}
        className={`p-2.5 rounded-md transition-all min-w-[36px] min-h-[36px] flex items-center justify-center ${viewMode === "list" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"}`}
        title="List view"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
