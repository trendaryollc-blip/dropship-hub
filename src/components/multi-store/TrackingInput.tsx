"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

interface TrackingInputProps {
  orderId: string;
  onTrackingAdded: () => void;
}

const CARRIERS = [
  "FedEx", "UPS", "DHL", "USPS", "Royal Mail", "Australia Post",
  "Canada Post", "Other",
];

export default function TrackingInput({ orderId, onTrackingAdded }: TrackingInputProps) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("Other");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user || !trackingNumber.trim()) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const result = await safeFetch<{ success: boolean; error?: string }>("/api/multi-store/orders/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "add_tracking", orderId, trackingNumber: trackingNumber.trim(), carrier }),
      });
      if (result.success) {
        success("Tracking number added");
        setSaved(true);
        onTrackingAdded();
      } else {
        toastError(result.error || "Failed to add tracking");
      }
    } catch {
      toastError("Failed to add tracking number");
    }
    setSaving(false);
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-[10px]">
        <CheckCircle2 className="h-3 w-3" />
        <span>Tracking saved: {trackingNumber}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        className="px-2 py-1 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50"
      >
        {CARRIERS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        type="text"
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value)}
        placeholder="Tracking number"
        className="px-2 py-1 rounded-lg bg-surface border border-border text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 w-36"
      />
      <button
        onClick={handleSave}
        disabled={!trackingNumber.trim() || saving}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 text-accent text-[10px] font-medium hover:bg-accent/20 transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
        Save
      </button>
    </div>
  );
}
