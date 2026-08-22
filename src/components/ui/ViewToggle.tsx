"use client";

import { LayoutGrid, List } from "lucide-react";

export default function ViewToggle({ viewMode, setViewMode }: { viewMode: "grid" | "list"; setViewMode: (v: "grid" | "list") => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-border">
      <button
        onClick={() => setViewMode("grid")}
        className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"}`}
        title="Grid view"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setViewMode("list")}
        className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"}`}
        title="List view"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
