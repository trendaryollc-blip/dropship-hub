"use client";

import { useState } from "react";
import { Link2, Unlink, RefreshCw, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAPI, useMutation, revalidate } from "@/hooks/useAPI";

interface AdConnection {
  id: string;
  platform: "facebook" | "google";
  accountId: string;
  accountName: string;
  status: "active" | "expired" | "error";
  createdAt: string;
}

const platformColors = {
  facebook: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  google: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
};

const platformIcons = {
  facebook: "M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z",
  google: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
};

export default function PlatformConnect() {
  const { data, isLoading } = useAPI<{ connections: AdConnection[] }>("/api/ad-connections");
  const { trigger: deleteConnection, isMutating } = useMutation("/api/ad-connections");
  const [connecting, setConnecting] = useState<"facebook" | "google" | null>(null);

  const connections = data?.connections || [];
  const facebookConnection = connections.find((c) => c.platform === "facebook");
  const googleConnection = connections.find((c) => c.platform === "google");

  const handleConnect = async (platform: "facebook" | "google") => {
    setConnecting(platform);
    const clientId = platform === "facebook" ? process.env.NEXT_PUBLIC_FACEBOOK_APP_ID : process.env.NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/ad-connections/callback`;
    const scope = platform === "facebook" ? "ads_management,ads_read" : "https://www.googleapis.com/auth/adwords";

    if (platform === "facebook") {
      window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
    } else {
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&access_type=offline`;
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    await deleteConnection({ body: {}, method: "DELETE", url: `/api/ad-connections/${connectionId}` });
    revalidate("/api/ad-connections");
  };

  const handleSync = async (platform: "facebook" | "google") => {
    setConnecting(platform);
    try {
      await fetch("/api/ad-campaigns/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      revalidate("/api/ad-campaigns");
    } finally {
      setConnecting(null);
    }
  };

  const renderPlatform = (platform: "facebook" | "google", connection?: AdConnection) => {
    const colors = platformColors[platform];
    const iconPath = platformIcons[platform];
    const isConnected = connection?.status === "active";
    const isExpired = connection?.status === "expired";

    return (
      <div key={platform} className={`p-4 rounded-xl border ${isConnected ? colors.border : "border-border"} bg-surface/50`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${colors.bg}`}>
            <svg className={`h-5 w-5 ${colors.text}`} viewBox="0 0 24 24" fill="currentColor">
              <path d={iconPath} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground capitalize">{platform} Ads</h4>
            {connection ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                {isConnected ? (
                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-amber-400" />
                )}
                <span className={`text-xs ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>
                  {isConnected ? `Connected (${connection.accountName})` : isExpired ? "Token expired" : "Error"}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">Not connected</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                onClick={() => handleSync(platform)}
                disabled={connecting === platform}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface/80 text-muted-foreground hover:text-foreground transition-all"
              >
                {connecting === platform ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </button>
            )}
            {isConnected ? (
              <button
                onClick={() => handleDisconnect(connection.id)}
                disabled={isMutating}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
              >
                <Unlink className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={() => handleConnect(platform)}
                disabled={connecting === platform}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-xs font-medium text-accent hover:bg-accent/20 transition-all"
              >
                {connecting === platform ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                Connect
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-surface rounded w-1/3" />
          <div className="h-16 bg-surface rounded" />
          <div className="h-16 bg-surface rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-accent" /> Platform Connections
      </h3>
      <div className="space-y-3">
        {renderPlatform("facebook", facebookConnection)}
        {renderPlatform("google", googleConnection)}
      </div>
    </div>
  );
}
