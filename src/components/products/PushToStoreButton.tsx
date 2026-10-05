"use client";

import { useState } from "react";
import { Loader2, Store } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import { useAPI } from "@/hooks/useAPI";

interface StoreConnection {
  id: string;
  name: string;
  platform: string;
}

interface PushToStoreButtonProps {
  productId: string;
  title: string;
  image?: string | null;
  price?: number | null;
  url?: string | null;
  description?: string | null;
  disabled?: boolean;
  disabledReason?: string;
  onPushed?: () => void;
}

export function PushToStoreButton({
  productId,
  title,
  image,
  price,
  url,
  description,
  disabled,
  disabledReason,
  onPushed,
}: PushToStoreButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const { data } = useAPI<{ connections?: StoreConnection[] }>(
    user && open ? "/api/store/connections" : null
  );
  const connections = data?.connections || [];

  const canPush = !!title && typeof price === "number" && price > 0;

  const handlePush = async (storeId: string, storeName: string) => {
    if (!user) return;
    setBusy(storeId);
    setResult(null);
    try {
      const token = await user.getIdToken();
      const res = await safeFetch("/api/store/push-with-supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          storeId,
          productId,
          title,
          image: image || "",
          price,
          url: url || "",
          description: description || title,
        }),
      });
      const json = (await (res as Response).json()) as { success?: boolean; error?: string; platformProductId?: string | number };
      setResult(json.success ? `Pushed to ${storeName}` : `Failed: ${json.error || "unknown error"}`);
      if (json.success) onPushed?.();
    } catch (e) {
      setResult(`Failed: ${e instanceof Error ? e.message : "network error"}`);
    }
    setBusy(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || !canPush}
        title={disabled ? disabledReason : !canPush ? "A price is required to push this listing" : undefined}
        className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Store className="h-3.5 w-3.5" /> List on Store
      </button>
      {open && !disabled && !canPush && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-white/10 bg-card p-3 shadow-xl">
          <p className="text-xs text-muted-foreground">
            This product has no price yet, so it can&apos;t be listed. Pick a supplier with a known cost first.
          </p>
        </div>
      )}
      {open && !disabled && canPush && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-white/10 bg-card p-2 shadow-xl">
          {connections.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No connected stores. Connect one in Settings → Stores first.
            </p>
          ) : (
            connections.map((s) => (
              <button
                key={s.id}
                onClick={() => handlePush(s.id, s.name)}
                disabled={busy !== null}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-white/5 disabled:opacity-50"
              >
                {busy === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Store className="h-3 w-3" />}
                <span className="flex-1">{s.name}</span>
                <span className="text-muted-foreground">{s.platform}</span>
              </button>
            ))
          )}
          {result && <p className="px-2 pt-2 text-xs text-muted-foreground">{result}</p>}
        </div>
      )}
    </div>
  );
}
