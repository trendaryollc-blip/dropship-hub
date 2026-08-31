"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { type StorePlatform } from "@/lib/store-catalog";
import { safeFetch } from "@/lib/safe-fetch";
import {
  X, Loader2, CheckCircle2, XCircle, ExternalLink,
  ChevronDown, ChevronUp, Store, Globe, AlertCircle,
} from "lucide-react";

interface Props {
  platform: StorePlatform;
  onClose: () => void;
  onConnected: () => void;
}

export default function StoreConnectModal({ platform, onClose, onConnected }: Props) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [storeName, setStoreName] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(true);

  const canSubmit =
    platform.fields.filter((f) => f.required).every((f) => formData[f.key]?.trim()) &&
    !connecting;

  const handleConnect = async () => {
    if (!user) return;
    setConnecting(true);
    setError("");
    try {
      const payload: Record<string, string> = {
        uid: user.uid,
        platform: platform.id,
        name: storeName.trim() || platform.name,
      };
      for (const field of platform.fields) {
        if (formData[field.key]) {
          payload[field.key] = formData[field.key];
        }
      }
      const storeUrl = formData.url || formData.storeDomain || formData.storeUrl || "";
      if (storeUrl) payload.url = storeUrl;

      await safeFetch<unknown>("/api/store/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Connect ${platform.name}`}>
      <div
        className="glass rounded-2xl border border-border w-full max-w-lg max-h-[90vh] shadow-2xl flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ background: platform.bg }}
            >
              <Store className="h-6 w-6" style={{ color: platform.color }} />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Connect {platform.name}</h3>
              <p className="text-xs text-muted-foreground">{platform.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-400/5 border border-red-400/20 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                testResult.ok
                  ? "bg-emerald-400/5 border border-emerald-400/20 text-emerald-400"
                  : "bg-red-400/5 border border-red-400/20 text-red-400"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {testResult.msg}
            </div>
          )}

          {/* Setup Guide */}
          {platform.setupGuide.length > 0 && (
            <div className="rounded-xl bg-surface/50 border border-border overflow-hidden">
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="w-full flex items-center justify-between p-3 text-xs font-medium text-foreground hover:bg-surface transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-accent" />
                  How to get your {platform.name} API credentials
                </span>
                {showGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showGuide && (
                <div className="px-3 pb-3 space-y-2">
                  {platform.setupGuide.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px] font-bold">
                        {i + 1}
                      </span>
                      <span>
                        {step.text}
                        {step.highlight && (
                          <span className="text-foreground font-medium">{step.highlight}</span>
                        )}
                      </span>
                    </div>
                  ))}
                  {platform.apiDocsUrl && (
                    <a
                      href={platform.apiDocsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover mt-1"
                    >
                      Official API Docs <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Store Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store Name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder={`My ${platform.name} Store`}
              className="w-full mt-1.5 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 transition-all text-sm"
            />
          </div>

          {/* Platform Fields */}
          {platform.fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {field.label}
                {field.required && <span className="text-accent ml-1">*</span>}
              </label>
              <input
                type={field.type === "password" ? "password" : field.type === "url" ? "url" : "text"}
                value={formData[field.key] || ""}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="w-full mt-1.5 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 transition-all text-sm"
              />
              {field.helpText && (
                <p className="text-[10px] text-muted-foreground mt-1">{field.helpText}</p>
              )}
            </div>
          ))}

          {/* Get API Key Link */}
          {platform.keyUrl && (
            <a
              href={platform.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
            >
              {platform.keyUrlLabel || "Get API Key"} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={!canSubmit}
            className="flex-1 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Store className="h-4 w-4" />
                Connect Store
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
