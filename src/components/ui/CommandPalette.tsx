"use client";

import { useEffect, useRef } from "react";
import { Search, ArrowUp, ArrowDown, CornerDownLeft, Command } from "lucide-react";
import { useCommandPalette } from "@/hooks/useCommandPalette";

const categoryLabels = {
  pages: "Pages",
  actions: "Quick Actions",
  products: "Products",
  settings: "Settings",
};

const categoryColors = {
  pages: "text-blue-400",
  actions: "text-emerald-400",
  products: "text-amber-400",
  settings: "text-purple-400",
};

export default function CommandPalette() {
  const {
    isOpen,
    query,
    results,
    selectedIndex,
    close,
    setQuery,
    selectNext,
    selectPrev,
    executeSelected,
  } = useCommandPalette();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const grouped = results.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, typeof results>
  );

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      {/* Palette */}
      <div className="relative w-full max-w-lg surface-floating rounded-2xl overflow-hidden animate-spring-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); selectNext(); }
              if (e.key === "ArrowUp") { e.preventDefault(); selectPrev(); }
              if (e.key === "Enter") { e.preventDefault(); executeSelected(); }
            }}
            placeholder="Search pages, actions, settings..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-display"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-surface border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            Object.entries(grouped).map(([category, cmds]) => (
              <div key={category} className="mb-2">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </div>
                {cmds.map((cmd) => {
                  flatIndex++;
                  const isSelected = flatIndex === selectedIndex;
                  const Icon = cmd.icon;
                  const _idx = flatIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        if (cmd.href) window.location.href = cmd.href;
                        close();
                      }}
                      onMouseEnter={() => {}}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        isSelected
                          ? "bg-accent/10 text-foreground"
                          : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border ${isSelected ? "border-accent/20" : ""}`}>
                        <Icon className={`h-4 w-4 ${isSelected ? "text-accent" : categoryColors[cmd.category]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cmd.label}</p>
                        {cmd.description && (
                          <p className="text-[11px] text-muted-foreground truncate">{cmd.description}</p>
                        )}
                      </div>
                      {isSelected && (
                        <CornerDownLeft className="h-3 w-3 text-accent shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> Navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft size={10} /> Select</span>
          <span className="flex items-center gap-1"><Command size={10} /> K to toggle</span>
        </div>
      </div>
    </div>
  );
}
