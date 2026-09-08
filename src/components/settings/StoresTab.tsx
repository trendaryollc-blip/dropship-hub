"use client";

import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Store,
} from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  platform: string;
  status: string;
  url: string;
}

interface StoresTabProps {
  stores: StoreItem[];
}

export default function StoresTab({ stores }: StoresTabProps) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass rounded-2xl p-5 border border-accent/10">
        <div className="flex items-start gap-3">
          <Store className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Store Connections</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Manage your connected stores. Push products, sync inventory, and track orders from one place.
            </p>
          </div>
        </div>
      </div>

      {stores.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Store className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No stores connected yet</p>
          <Link href="/store" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all">
            Connect a Store
          </Link>
        </div>
      ) : (
        stores.map((store) => (
          <div key={store.id} className="glass rounded-2xl p-5 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                  <Store className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{store.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{store.platform} · {store.url || "No URL"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                  store.status === "connected"
                    ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                    : "bg-red-400/10 text-red-400 border border-red-400/20"
                }`}>
                  {store.status === "connected" ? <><CheckCircle2 className="h-3 w-3" /> Connected</> : <><AlertTriangle className="h-3 w-3" /> Disconnected</>}
                </span>
                <Link href="/store" className="text-xs text-accent hover:text-accent/80">Manage</Link>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
