"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Store, Package, RefreshCw, BarChart3, Send, Settings, Search,
  ShoppingCart, Globe, Zap, X,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const navigate = useCallback((path: string) => {
    router.push(path);
    onOpenChange(false);
  }, [router, onOpenChange]);

  const runAction = useCallback((action: () => void) => {
    action();
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <Command
        value={search}
        onValueChange={setSearch}
        className="relative w-full max-w-lg glass rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Command.Input
            autoFocus
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="text-center py-6 text-xs text-muted-foreground">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="mb-2">
            <CommandItem
              icon={<Store className="h-4 w-4" />}
              label="My Stores"
              description="Manage store connections"
              onSelect={() => navigate("/store")}
            />
            <CommandItem
              icon={<Globe className="h-4 w-4" />}
              label="Multi-Store Dashboard"
              description="Unified view across all stores"
              onSelect={() => navigate("/multi-store")}
            />
            <CommandItem
              icon={<Package className="h-4 w-4" />}
              label="Products"
              description="Browse product catalog"
              onSelect={() => navigate("/products")}
            />
            <CommandItem
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              description="Manage your account"
              onSelect={() => navigate("/settings")}
            />
          </Command.Group>

          <Command.Group heading="Quick Actions" className="mb-2">
            <CommandItem
              icon={<Store className="h-4 w-4" />}
              label="Connect New Store"
              description="Add a new store connection"
              onSelect={() => navigate("/store")}
            />
            <CommandItem
              icon={<Send className="h-4 w-4" />}
              label="Bulk Push Products"
              description="Push products to multiple stores"
              onSelect={() => navigate("/multi-store?tab=bulk-push")}
            />
            <CommandItem
              icon={<RefreshCw className="h-4 w-4" />}
              label="Sync Inventory"
              description="Sync stock levels across stores"
              onSelect={() => navigate("/multi-store?tab=inventory")}
            />
            <CommandItem
              icon={<BarChart3 className="h-4 w-4" />}
              label="View Performance"
              description="Compare store performance"
              onSelect={() => navigate("/multi-store?tab=performance")}
            />
            <CommandItem
              icon={<ShoppingCart className="h-4 w-4" />}
              label="View Orders"
              description="Manage unified orders"
              onSelect={() => navigate("/multi-store?tab=orders")}
            />
          </Command.Group>

          <Command.Group heading="AI">
            <CommandItem
              icon={<Zap className="h-4 w-4" />}
              label="AI Store Assistant"
              description="Ask anything about your stores"
              onSelect={() => runAction(() => {
                const btn = document.querySelector('[title="AI Store Assistant"]') as HTMLButtonElement;
                btn?.click();
              })}
            />
          </Command.Group>
        </Command.List>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[9px]">Enter</kbd> to select
          </span>
          <span className="text-[10px] text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[9px]">Esc</kbd> to close
          </span>
        </div>
      </Command>
    </div>
  );
}

function CommandItem({ icon, label, description, onSelect }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
    >
      <div className="p-1.5 rounded-lg bg-surface">{icon}</div>
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
    </Command.Item>
  );
}
