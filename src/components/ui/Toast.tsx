"use client";

import { useState, useEffect, useCallback, createContext, useContext, useRef, useMemo } from "react";
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const icons: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors: Record<ToastType, { icon: string; bg: string; border: string }> = {
  success: { icon: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  error: { icon: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  warning: { icon: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  info: { icon: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = icons[toast.type];
  const clr = colors[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl glass border ${clr.border} shadow-2xl animate-slide-up max-w-sm`}>
      <div className={`p-1 rounded-lg ${clr.bg} shrink-0 mt-0.5`}>
        <Icon className={`h-4 w-4 ${clr.icon}`} />
      </div>
      <p className="text-sm text-foreground flex-1">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="text-muted-foreground hover:text-foreground shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    counterRef.current += 1;
    const id = `toast-${counterRef.current}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
  }, []);

  const value: ToastContextValue = useMemo(
    () => ({
      toast: addToast,
      success: (msg) => addToast("success", msg),
      error: (msg) => addToast("error", msg),
      warning: (msg) => addToast("warning", msg),
      info: (msg) => addToast("info", msg),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
