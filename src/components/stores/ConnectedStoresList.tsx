"use client";

import Link from "next/link";
import {
  Trash2, ExternalLink, Send, RefreshCw, CheckCircle2,
  XCircle, AlertTriangle, Store, Loader2, GripVertical,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { STORE_CATALOG } from "@/lib/store-catalog";

export interface ConnectedStore {
  id: string;
  platform: string;
  name: string;
  url: string;
  backendUrl?: string;
  apiKey?: string;
  status: "connected" | "disconnected" | "error";
  connectedAt: string;
  lastSyncAt?: string;
  productCount?: number;
  orderCount?: number;
}

interface Props {
  stores: ConnectedStore[];
  syncing: string | null;
  onRefresh: () => void;
  onSync: (store: ConnectedStore) => void;
  onDisconnect: (storeId: string) => void;
  onReorder?: (stores: ConnectedStore[]) => void;
}

function SortableStoreCard({ store, syncing, onRefresh: _onRefresh, onSync, onDisconnect, draggable }: {
  store: ConnectedStore;
  syncing: string | null;
  onRefresh: () => void;
  onSync: (store: ConnectedStore) => void;
  onDisconnect: (storeId: string) => void;
  draggable: boolean;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: store.id, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  const catalog = STORE_CATALOG.find((p) => p.id === store.platform);
  const isTrendaryo = store.platform === "trendaryo";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass rounded-2xl border border-border p-5 transition-all ${
        isDragging ? "shadow-2xl border-accent/50" : "hover:border-accent/30"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {draggable && (
            <button
              {...attributes}
              {...listeners}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ background: catalog?.bg || "#f0f0f0" }}
          >
            <Store className="h-6 w-6" style={{ color: catalog?.color || "#666" }} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{store.name}</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[250px]">{store.url}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              store.status === "connected"
                ? "bg-emerald-400/10 text-emerald-400"
                : store.status === "error"
                ? "bg-red-400/10 text-red-400"
                : "bg-muted-foreground/10 text-muted-foreground"
            }`}
          >
            {store.status === "connected" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : store.status === "error" ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {store.status === "connected" ? "Connected" : store.status === "error" ? "Error" : "Disconnected"}
          </span>
        </div>
      </div>

      {isTrendaryo && (store.productCount != null || store.orderCount != null) && (
        <div className="flex gap-4 mt-3 p-3 rounded-xl bg-surface/50 border border-border">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{store.productCount ?? "\u2014"}</p>
            <p className="text-[10px] text-muted-foreground">Products</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{store.orderCount ?? "\u2014"}</p>
            <p className="text-[10px] text-muted-foreground">Orders</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        <span className="text-[10px] text-muted-foreground">
          Connected {new Date(store.connectedAt).toLocaleDateString()}
          {store.lastSyncAt && ` \u00b7 Synced ${new Date(store.lastSyncAt).toLocaleDateString()}`}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {isTrendaryo && (
            <button
              onClick={() => onSync(store)}
              disabled={syncing === store.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-400/10 border border-rose-400/20 text-rose-400 text-xs font-medium hover:bg-rose-400/20 transition-all disabled:opacity-50"
            >
              {syncing === store.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Sync
            </button>
          )}
          <Link
            href="/multi-store"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/20 transition-all"
          >
            <Send className="h-3 w-3" />
            Push Products
          </Link>
          {store.url && (
            <a
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground transition-all"
            >
              <ExternalLink className="h-3 w-3" />
              Visit
            </a>
          )}
          <button
            onClick={() => onDisconnect(store.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-medium hover:bg-red-400/20 transition-all"
            title="Disconnect store"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConnectedStoresList({ stores, syncing, onRefresh: _onRefresh, onSync, onDisconnect, onReorder }: Props) {
  const draggable = !!onReorder;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = stores.findIndex((s) => s.id === active.id);
    const newIndex = stores.findIndex((s) => s.id === over.id);
    onReorder(arrayMove(stores, oldIndex, newIndex));
  };

  if (stores.length === 0) return null;

  const cards = stores.map((store) => (
    <SortableStoreCard
      key={store.id}
      store={store}
      syncing={syncing}
      onRefresh={_onRefresh}
      onSync={onSync}
      onDisconnect={onDisconnect}
      draggable={draggable}
    />
  ));

  if (!draggable) {
    return <div className="space-y-3">{cards}</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={stores.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">{cards}</div>
      </SortableContext>
    </DndContext>
  );
}
