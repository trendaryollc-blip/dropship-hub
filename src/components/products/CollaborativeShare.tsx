"use client";

import { useState, useCallback } from "react";
import { Share2, Link2, Copy, Check, X, Users, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";

interface CollaborativeShareProps {
  products: Array<{ id: string; title: string; price: number | null; image: string | null; source: string }>;
  isOpen: boolean;
  onClose: () => void;
}

export default function CollaborativeShare({ products, isOpen, onClose }: CollaborativeShareProps) {
  const { user } = useAuth();
  const [shareMode, setShareMode] = useState<"link" | "email">("link");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const generateShareLink = useCallback(async () => {
    if (!user || products.length === 0) return;
    try {
      const token = await user.getIdToken();
      const data = await safeFetch<{ link?: string }>(`/api/shortlist/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          uid: user.uid,
          products: products.map((p) => ({ id: p.id, title: p.title, price: p.price, image: p.image, source: p.source })),
          createdBy: user.email,
        }),
      });
      if (data.link) setShareLink(data.link);
    } catch { /* ignore */ }
  }, [user, products]);

  const copyLink = async () => {
    if (!shareLink) {
      await generateShareLink();
    }
    try {
      await navigator.clipboard.writeText(shareLink || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const sendEmail = async () => {
    if (!user || !email.trim()) return;
    setSending(true);
    try {
      const token = await user.getIdToken();
      await safeFetch(`/api/shortlist/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          uid: user.uid,
          products: products.map((p) => ({ id: p.id, title: p.title, price: p.price, image: p.image, source: p.source })),
          shareWith: email,
          message,
          createdBy: user.email,
        }),
      });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } catch { /* ignore */ }
    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-accent" />
            <h3 className="text-white font-bold">Share Shortlist</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Product count */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
            <Users className="h-4 w-4 text-accent" />
            <span className="text-xs text-gray-300">
              Sharing <span className="font-bold text-white">{products.length}</span> product{products.length !== 1 ? "s" : ""} in your shortlist
            </span>
          </div>

          {/* Share mode tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setShareMode("link")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                shareMode === "link"
                  ? "bg-accent text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              Copy Link
            </button>
            <button
              onClick={() => setShareMode("email")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                shareMode === "email"
                  ? "bg-accent text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Send Email
            </button>
          </div>

          {shareMode === "link" ? (
            <div className="space-y-3">
              <button
                onClick={generateShareLink}
                disabled={!!shareLink}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-all disabled:opacity-50"
              >
                {shareLink ? "Link Generated" : "Generate Share Link"}
              </button>
              {shareLink && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none"
                  />
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-xs font-medium transition-all"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message (optional)..."
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none h-20"
              />
              <button
                onClick={sendEmail}
                disabled={sending || !email.trim() || success}
                className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                ) : success ? (
                  <><Check className="h-4 w-4" /> Sent!</>
                ) : (
                  <><Send className="h-4 w-4" /> Send Shortlist</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Send(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
