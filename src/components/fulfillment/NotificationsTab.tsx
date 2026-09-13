"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "firebase/auth";
import {
  BellOff, CheckCheck, Trash2, Filter,
  Loader2,
} from "lucide-react";
import type { AppNotification, NotificationType } from "@/types/fulfillment";
import { NOTIFICATION_TYPE_CONFIG } from "@/types/fulfillment";

interface NotificationsTabProps {
  authFetch: (url: string, init?: RequestInit) => Promise<unknown>;
  user: User | null;
}

const FILTER_CATEGORIES = [
  { key: "all", label: "All", types: null },
  { key: "orders", label: "Orders", types: ["order_received", "order_approved", "order_shipped", "order_delivered", "order_cancelled"] as NotificationType[] },
  { key: "returns", label: "Returns", types: ["return_requested", "return_approved", "refund_processed"] as NotificationType[] },
  { key: "alerts", label: "Alerts", types: ["supplier_alert", "sla_warning", "sla_breach", "inventory_low"] as NotificationType[] },
  { key: "system", label: "System", types: ["bulk_operation_complete", "system_alert"] as NotificationType[] },
] as const;

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-500 animate-pulse",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-gray-500",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "1 day ago";
  if (diffDay < 30) return `${diffDay} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsTab({ authFetch, user }: NotificationsTabProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      const cat = FILTER_CATEGORIES.find((c) => c.key === activeFilter);
      if (cat?.types && cat.types.length === 1) {
        params.set("type", cat.types[0]);
      }

      const data = await authFetch(`/api/fulfillment/notifications?${params.toString()}`) as {
        notifications?: AppNotification[];
        total?: number;
        unreadCount?: number;
        totalPages?: number;
      };

      let filtered = data.notifications || [];
      if (cat?.types && cat.types.length > 1) {
        filtered = filtered.filter((n) => cat.types!.includes(n.type));
      }

      setNotifications(filtered);
      setUnreadCount(data.unreadCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setNotifications([]);
    }
    setLoading(false);
  }, [user, page, activeFilter, authFetch]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await authFetch(`/api/fulfillment/notifications/${notificationId}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await authFetch("/api/fulfillment/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
    setMarkingAll(false);
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await authFetch(`/api/fulfillment/notifications/${notificationId}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-accent text-white text-[10px] font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-accent transition-all disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCheck className="h-3 w-3" />
            )}
            Mark All Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1 overflow-x-auto">
        {FILTER_CATEGORIES.map((cat) => {
          const isActive = activeFilter === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => { setActiveFilter(cat.key); setPage(1); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface"
              }`}
            >
              {cat.key === "all" && <Filter className="h-3 w-3" />}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <BellOff className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const config = NOTIFICATION_TYPE_CONFIG[notification.type];
            const priorityStyle = PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.medium;

            return (
              <div
                key={notification.id}
                onClick={() => !notification.read && markAsRead(notification.id)}
                className={`glass rounded-lg p-3 flex items-start gap-3 transition-all cursor-pointer hover:border-accent/30 ${
                  !notification.read ? "border-l-2 border-l-accent" : "opacity-70"
                }`}
              >
                {/* Priority dot */}
                <div className="flex-shrink-0 mt-1.5">
                  <div className={`w-2 h-2 rounded-full ${priorityStyle}`} />
                </div>

                {/* Type icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm ${config?.bg || "bg-surface"}`}>
                  {config?.icon || "🔔"}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config?.bg || "bg-surface"} ${config?.color || "text-muted-foreground"}`}>
                      {config?.label || notification.type}
                    </span>
                    {!notification.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{notification.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{notification.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notification.createdAt)}</p>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                  className="flex-shrink-0 p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
          >
            Prev
          </button>
          <span className="text-[11px] text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
