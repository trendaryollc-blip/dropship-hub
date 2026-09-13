"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 5;

const TOAST_CONFIG: Record<ToastType, { icon: React.ElementType; borderColor: string; bg: string; iconColor: string }> = {
  success: {
    icon: CheckCircle,
    borderColor: "border-l-emerald-500",
    bg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
  },
  error: {
    icon: AlertCircle,
    borderColor: "border-l-red-500",
    bg: "bg-red-500/10",
    iconColor: "text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    borderColor: "border-l-amber-500",
    bg: "bg-amber-500/10",
    iconColor: "text-amber-400",
  },
  info: {
    icon: Info,
    borderColor: "border-l-blue-500",
    bg: "bg-blue-500/10",
    iconColor: "text-blue-400",
  },
};

let toastCounter = 0;

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const config = TOAST_CONFIG[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration);

    return () => clearTimeout(timeout);
  }, [toast.duration, toast.id, onRemove]);

  return (
    <div
      className={`
        flex items-start gap-3 w-80 p-3 rounded-lg glass border-l-4 ${config.borderColor}
        shadow-depth-3 animate-slide-in-right
        ${isExiting ? "opacity-0 translate-x-4 transition-all duration-300" : ""}
      `}
    >
      <div className={`mt-0.5 ${config.iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="flex-1 text-xs text-foreground leading-relaxed">{toast.message}</p>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 5000) => {
      const id = `toast-${++toastCounter}`;
      const newToast: Toast = { id, type, message, duration };

      setToasts((prev) => {
        const next = [newToast, ...prev];
        return next.length > MAX_VISIBLE ? next.slice(0, MAX_VISIBLE) : next;
      });
    },
    []
  );

  const toast = {
    success: (message: string, duration?: number) => addToast("success", message, duration),
    error: (message: string, duration?: number) => addToast("error", message, duration),
    warning: (message: string, duration?: number) => addToast("warning", message, duration),
    info: (message: string, duration?: number) => addToast("info", message, duration),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 items-end">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
