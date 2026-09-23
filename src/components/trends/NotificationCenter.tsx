"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  keyword?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  uid: string;
  className?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-400/10 text-blue-400",
  warning: "bg-amber-400/10 text-amber-400",
  critical: "bg-red-400/10 text-red-400",
};

export default function NotificationCenter({ uid, className = "" }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchNotifications = async () => {
      try {
        const [notifRes, countRes] = await Promise.all([
          fetch(`/api/ai/trends/notifications?count=20`),
          fetch(`/api/ai/trends/notifications?action=unread-count`),
        ]);
        if (cancelled) return;
        if (notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(data.notifications || []);
        }
        if (countRes.ok) {
          const data = await countRes.json();
          setUnreadCount(data.unread || 0);
        }
      } catch {
        // Non-critical
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [uid]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  const markRead = async (id: string) => {
    try {
      await fetch("/api/ai/trends/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-read", notificationId: id }),
      });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Non-critical
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/ai/trends/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Non-critical
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative p-2 rounded-lg hover:bg-surface transition-all"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-white text-[8px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-1 z-30 w-80 max-h-96 overflow-y-auto rounded-xl bg-background border border-border shadow-xl"
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-accent hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 hover:bg-surface transition-all cursor-pointer ${
                      !n.read ? "bg-accent/5" : ""
                    }`}
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${SEVERITY_COLORS[n.severity]}`}>
                        {n.read ? <CheckCheck className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{n.title}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{n.message}</p>
                        <p className="text-[9px] text-muted-foreground mt-1">
                          {formatDate(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
