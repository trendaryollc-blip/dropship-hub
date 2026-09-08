"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mail, Send, CheckCircle2, Loader2, AlertCircle, Minus, Square } from "lucide-react";
import { auth } from "@/lib/firebase";

interface SupplierContactSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  supplierName: string;
}

export default function SupplierContactSlideOver({ isOpen, onClose, supplierId, supplierName }: SupplierContactSlideOverProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
    quantity: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const windowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const centerWindow = useCallback(() => {
    if (typeof window !== "undefined") {
      setPosition({
        x: Math.max(0, (window.innerWidth - 520) / 2),
        y: Math.max(20, (window.innerHeight - 560) / 2),
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      centerWindow();
      setIsMinimized(false);
    }
  }, [isOpen, centerWindow]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleDragStart = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setPosition({
        x: Math.max(0, Math.min(newX, window.innerWidth - 100)),
        y: Math.max(0, Math.min(newY, window.innerHeight - 40)),
      });
    };

    const handleDragEnd = () => {
      isDragging.current = false;
    };

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    return () => {
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to contact a supplier");
        setIsSubmitting(false);
        return;
      }

      const token = await user.getIdToken();

      const response = await fetch("/api/suppliers/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplierId,
          supplierName,
          name: formData.name,
          email: formData.email,
          company: formData.company,
          quantity: formData.quantity,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send inquiry");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setFormData({ name: "", email: "", company: "", subject: "", message: "", quantity: "" });
    setError(null);
    setIsMinimized(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity pointer-events-auto"
        onClick={handleClose}
      />

      <div
        ref={windowRef}
        className={`absolute pointer-events-auto flex flex-col bg-[#1a1a1f] border border-white/[0.08] rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)] transition-all duration-200 animate-window-open ${
          isMinimized ? "h-11" : "h-auto"
        }`}
        style={{
          left: position.x,
          top: position.y,
          width: 520,
          maxHeight: isMinimized ? 44 : "85vh",
          animation: "windowOpen 0.2s ease-out",
        }}
      >
        {/* Title Bar */}
        <div
          ref={dragRef}
          onMouseDown={handleDragStart}
          className="flex items-center justify-between h-11 px-4 rounded-t-xl bg-gradient-to-b from-white/[0.06] to-transparent border-b border-white/[0.06] cursor-grab active:cursor-grabbing select-none shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-accent/15">
              <Mail className="h-3 w-3 text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white leading-tight">Contact Supplier</span>
              <span className="text-[9px] text-neutral-500 leading-tight">{supplierName}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              className="p-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Minimize"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleClose(); }}
              className="p-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-red-500/80 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Window Body */}
        {!isMinimized && (
          <div className="flex-1 overflow-y-auto p-5 min-h-0">
            {submitted ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-white mb-2">Message Sent!</h4>
                <p className="text-sm text-neutral-400 mb-6 max-w-xs mx-auto">
                  Your inquiry has been sent to {supplierName}. They typically respond within their stated response time.
                </p>
                <button
                  onClick={handleClose}
                  className="text-sm text-accent hover:text-accent/80 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1.5 font-medium">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1.5 font-medium">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1.5 font-medium">Company</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                      placeholder="Your Company LLC"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1.5 font-medium">Quantity Needed</label>
                    <input
                      type="text"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                      placeholder="e.g., 100-500 units/month"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1.5 font-medium">Subject *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                    placeholder="Product sourcing inquiry"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1.5 font-medium">Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all resize-none"
                    placeholder="Describe what products you're looking for, your target price, and any specific requirements..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Send Inquiry
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
