"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Store,
  Link2,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  ShoppingCart,
  Globe,
  Package,
  Zap,
  ArrowRight,
  Loader2,
  Plus,
  X,
  Send,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface ConnectedStore {
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

interface PushedProduct {
  id: string;
  storeId: string;
  storeName: string;
  productTitle: string;
  productImage: string;
  productPrice: number;
  productUrl: string;
  productDescription?: string;
  status: "pushed" | "live" | "error";
  pushedAt: string;
}

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  description: string;
  authType: "api_key" | "oauth" | "manual";
  fields: { key: string; label: string; placeholder: string; type: string; required: boolean; helpText?: string }[];
}

const ShopifyIcon = () => (
  <svg viewBox="0 0 38 38" fill="none" className="w-full h-full">
    <rect width="38" height="38" rx="8" fill="#96BF48"/>
    <path d="M25.7 10.5c-.2 0-.4-.1-.5-.1s-.3 0-.4.1c-.1.1-.2.3-.2.5v1.3c0 .2.1.3.3.4.1 0 .2.1.4.1h.2c.3 0 .5.2.6.4v1.7c0 .3-.2.5-.5.6h-.2c-.2 0-.3.1-.4.3v3.1c0 .2-.1.3-.3.4h-1.1c-.2 0-.3-.1-.4-.3V16c0-.2-.1-.3-.3-.4h-1.1c-.2 0-.3.1-.4.3v3.1c0 .2-.1.3-.3.4h-1.1c-.2 0-.3-.1-.4-.3v-4c0-.2-.1-.3-.3-.4h-.8c-.1 0-.2-.1-.2-.2V13c0-.1.1-.2.2-.2h.8c.2 0 .3-.1.4-.3V9.7c0-.3.2-.5.5-.6h2.7c.2 0 .3.1.4.3.1.2.2.3.4.3.2 0 .3-.1.4-.3.1-.2.2-.3.4-.3h2.7c.2 0 .4.2.4.4 0 .1 0 .2-.1.3v.3c.1.2.2.3.3.5z" fill="white"/>
    <path d="M20.3 22.1c-.8.6-1.8.9-2.8.9s-2-.3-2.8-.9c-.1-.1-.1-.2 0-.3l2.8-1.7c.1 0 .2 0 .3 0s.2 0 .3 0l2.8 1.7c.1.1.1.2 0 .3z" fill="white"/>
    <path d="M21.5 19.2l-1.2.7v4.3c0 .3-.2.6-.5.7-.3.1-.6.1-.9-.1-.4-.2-.6-.5-.6-.9v-4l-1.2.7c-.2.1-.4 0-.5-.2-.1-.2-.1-.4 0-.5l2-1.2c.1-.1.3-.1.4 0l2 1.2c.2.1.2.4.1.5-.2.2-.4.2-.6.1z" fill="white"/>
    <path d="M19 26.5c-.7 0-1.3-.2-1.9-.5-.2-.1-.2-.4-.1-.6.1-.2.4-.2.6-.1.4.2.9.3 1.4.3s1-.1 1.4-.3c.2-.1.4 0 .6.1.1.2.1.5-.1.6-.6.3-1.2.5-1.8.5z" fill="white"/>
  </svg>
);

const WooCommerceIcon = () => (
  <svg viewBox="0 0 38 38" fill="none" className="w-full h-full">
    <rect width="38" height="38" rx="8" fill="#7B61FF"/>
    <path d="M19 8c-6.1 0-11 4.9-11 11s4.9 11 11 11 11-4.9 11-11S25.1 8 19 8zm5.2 15.8c-.3.4-.9.5-1.3.3-3.5-2.2-7.9-2.7-13.1-1.5-.5.1-1-.2-1.1-.7-.1-.5.2-1 .7-1.1 5.7-1.3 10.5-.7 14.5 1.7.4.3.5.9.3 1.3zm1.4-3.2c-.4.5-1.1.7-1.6.3-4-2.4-10.1-3.1-14.8-1.7-.6.2-1.2-.1-1.4-.7-.2-.6.1-1.2.7-1.4 5.4-1.6 12.3-.9 17 2 .5.3.7 1 .3 1.5h-.2zm.1-3.3c-4.8-2.9-12.8-3.1-17.4-1.7-.7.2-1.4-.2-1.6-.9-.2-.7.2-1.4.9-1.6 5.4-1.6 14.3-1.4 20 2 .6.4.8 1.2.4 1.8-.3.6-1.1.8-1.7.4h-.6z" fill="white"/>
  </svg>
);

const AmazonIcon = () => (
  <svg viewBox="0 0 38 38" fill="none" className="w-full h-full">
    <rect width="38" height="38" rx="8" fill="#232F3E"/>
    <path d="M10.5 22.5c3.5 2.5 8 3.8 12.3 3.8 3.5 0 6.9-.9 9.8-2.6" stroke="#FF9900" strokeWidth="2" strokeLinecap="round"/>
    <path d="M28 18c0 .8-.1 1.5-.2 2.2-.3 1.7-1.1 3-2.5 3.7-1.2.6-2.5.7-3.8.4-1.6-.4-2.7-1.4-3.2-2.9-.6-1.7-.3-3.5.8-5 .8-1.1 1.9-1.8 3.2-2 .5-.1 1.1-.1 1.6-.1h3.5c.1-.3.1-.6.2-.9 0-.1.1-.3 0-.4-.1-.3-.3-.5-.5-.6l-4.1-.5c-.3 0-.5-.1-.7-.3-.3-.3-.4-.6-.4-1 0-.6.2-1.1.5-1.5.5-.6 1.2-.9 2-1.1.7-.2 1.4-.2 2.1-.1l.5.1c.5.1.9.3 1.2.7.2.3.3.6.3 1v.8c0 .2-.1.4-.2.5 0 .1-.1.2-.2.2-.3.1-.6.1-.9 0-.5-.1-1-.3-1.4-.5-.5-.3-1-.5-1.5-.5-.6-.1-1.2-.1-1.8.1-.8.3-1.3.8-1.5 1.6-.2.7-.1 1.4.2 2 .3.7.8 1.1 1.5 1.3.6.2 1.2.2 1.8.1l3.5-.8c.3-.1.6-.2.8-.4.3-.3.4-.6.5-1 .1-.3.1-.7.1-1V15c0-1.8-.4-3.5-1.3-5-.8-1.3-2-2.3-3.4-2.9-1.3-.5-2.7-.7-4.1-.6-1.6.1-3.1.6-4.4 1.5-1.4.9-2.4 2.2-3 3.8-.2.5-.3 1-.3 1.5 0 .5.1.9.4 1.3.4.5.9.7 1.5.7.4 0 .8-.1 1.2-.3.5-.3.8-.7.9-1.2.1-.3.2-.6.4-.8.4-.5.9-.8 1.5-.9.5-.1 1 0 1.4.2.5.3.8.7.9 1.3.1.4.1.8 0 1.2l-.2.5z" fill="#FF9900"/>
    <path d="M12 17.5c.1-.5.2-1 .4-1.5.5-1.3 1.4-2 2.7-2.1.8-.1 1.5.1 2.1.5.6.5 1 1.2 1.1 2.1.1.7 0 1.4-.3 2.1-.5 1.1-1.3 1.8-2.6 2.1-.7.2-1.4.2-2.1 0-.9-.3-1.5-.9-1.8-1.8-.1-.3-.2-.6-.2-1z" fill="#FF9900"/>
  </svg>
);

const EbayIcon = () => (
  <svg viewBox="0 0 38 38" fill="none" className="w-full h-full">
    <rect width="38" height="38" rx="8" fill="#E53238"/>
    <text x="6" y="26" fill="white" fontWeight="bold" fontSize="14" fontFamily="Arial">e</text>
    <text x="13" y="26" fill="#0064D2" fontWeight="bold" fontSize="14" fontFamily="Arial">B</text>
    <text x="21" y="26" fill="#F5AF02" fontWeight="bold" fontSize="14" fontFamily="Arial">a</text>
    <text x="28" y="26" fill="#86B817" fontWeight="bold" fontSize="14" fontFamily="Arial">y</text>
  </svg>
);

const EtsyIcon = () => (
  <svg viewBox="0 0 38 38" fill="none" className="w-full h-full">
    <rect width="38" height="38" rx="8" fill="#F1641E"/>
    <text x="8" y="26" fill="white" fontWeight="bold" fontSize="15" fontFamily="Georgia, serif" fontStyle="italic">Etsy</text>
  </svg>
);

const WixIcon = () => (
  <svg viewBox="0 0 38 38" fill="none" className="w-full h-full">
    <rect width="38" height="38" rx="8" fill="#0C6EFC"/>
    <text x="5" y="26" fill="white" fontWeight="bold" fontSize="16" fontFamily="Arial">Wix</text>
  </svg>
);

const BigCommerceIcon = () => (
  <svg viewBox="0 0 38 38" fill="none" className="w-full h-full">
    <rect width="38" height="38" rx="8" fill="#34313F"/>
    <text x="4" y="24" fill="white" fontWeight="bold" fontSize="12" fontFamily="Arial">Big</text>
    <text x="4" y="32" fill="white" fontWeight="bold" fontSize="9" fontFamily="Arial">Commerce</text>
  </svg>
);

const TrendaryoIcon = () => (
  <svg viewBox="0 0 38 38" fill="none" className="w-full h-full">
    <rect width="38" height="38" rx="8" fill="#E11D48"/>
    <path d="M10 26V12l9 14V12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M24 12h4l-4 14h4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CustomStoreIcon = () => (
  <svg viewBox="0 0 38 38" fill="none" className="w-full h-full">
    <rect width="38" height="38" rx="8" fill="#F59E0B"/>
    <path d="M14 12l5-4 5 4v4l-5 4-5-4v-4z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M14 16l5 4 5-4" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M14 20v4l5 4 5-4v-4" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
  </svg>
);

const PLATFORMS: Platform[] = [
  {
    id: "trendaryo",
    name: "Trendaryo",
    icon: <TrendaryoIcon />,
    color: "#e11d48",
    bg: "#fff1f2",
    description: "Your store — full two-way sync",
    authType: "api_key",
    fields: [
      { key: "url", label: "Store URL", placeholder: "https://trendaryo.com", type: "url", required: true },
      { key: "backendUrl", label: "Backend API URL", placeholder: "https://trendaryo-llc-backend.vercel.app", type: "url", required: true },
      { key: "apiKey", label: "API Key", placeholder: "trend_xxxxxxxxxxxxx", type: "password", required: true, helpText: "Create via POST /api/keys with your admin account" },
    ],
  },
  {
    id: "shopify",
    name: "Shopify",
    icon: <ShopifyIcon />,
    color: "#5e8e3e",
    bg: "#f0f7e8",
    description: "World's most popular e-commerce platform",
    authType: "api_key",
    fields: [
      { key: "storeDomain", label: "Store Domain", placeholder: "your-store.myshopify.com", type: "url", required: true },
      { key: "accessToken", label: "Access Token", placeholder: "shpat_xxxxxxxxxxxxx", type: "password", required: true, helpText: "From Shopify Admin > Settings > Apps > Develop apps" },
    ],
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    icon: <WooCommerceIcon />,
    color: "#7b61ff",
    bg: "#f0edff",
    description: "WordPress e-commerce plugin",
    authType: "api_key",
    fields: [
      { key: "url", label: "Store URL", placeholder: "https://yourstore.com", type: "url", required: true },
      { key: "apiKey", label: "Consumer Key", placeholder: "ck_xxxxxxxxxxxxx", type: "password", required: true },
      { key: "apiSecret", label: "Consumer Secret", placeholder: "cs_xxxxxxxxxxxxx", type: "password", required: true },
    ],
  },
  {
    id: "amazon",
    name: "Amazon",
    icon: <AmazonIcon />,
    color: "#ff9900",
    bg: "#fff8ee",
    description: "Sell on the world's largest marketplace",
    authType: "manual",
    fields: [
      { key: "sellerId", label: "Seller ID", placeholder: "A1B2C3D4E5F6G7", type: "text", required: true },
      { key: "mwsAuthToken", label: "MWS Auth Token", placeholder: "amzn.mws.xxxxxxxx", type: "password", required: true, helpText: "From Amazon Seller Central > Settings > User Permissions" },
    ],
  },
  {
    id: "ebay",
    name: "eBay",
    icon: <EbayIcon />,
    color: "#e53238",
    bg: "#fde8e8",
    description: "Auction & buy-it-now marketplace",
    authType: "api_key",
    fields: [
      { key: "appId", label: "App ID (Client ID)", placeholder: "YourAppId-xxxx-xxxx-xxxx", type: "text", required: true },
      { key: "certId", label: "Cert ID", placeholder: "YourCertId-xxxx-xxxx-xxxx", type: "password", required: true },
      { key: "accessToken", label: "User Token", placeholder: "v%^1%^...", type: "password", required: true },
    ],
  },
  {
    id: "etsy",
    name: "Etsy",
    icon: <EtsyIcon />,
    color: "#f1641e",
    bg: "#fff0e8",
    description: "Handmade & vintage marketplace",
    authType: "oauth",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "xxxxxxxxxxxxxxxxxxxx", type: "password", required: true },
      { key: "shopId", label: "Shop ID", placeholder: "12345678", type: "text", required: true },
    ],
  },
  {
    id: "wix",
    name: "Wix",
    icon: <WixIcon />,
    color: "#0c6eFC",
    bg: "#e8f2ff",
    description: "Website builder with online store",
    authType: "api_key",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx", type: "password", required: true },
      { key: "storeUrl", label: "Store URL", placeholder: "https://yourstore.wixsite.com/mystore", type: "url", required: true },
    ],
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    icon: <BigCommerceIcon />,
    color: "#34313f",
    bg: "#f0eff1",
    description: "Enterprise e-commerce platform",
    authType: "api_key",
    fields: [
      { key: "storeHash", label: "Store Hash", placeholder: "xxxxxxx", type: "text", required: true },
      { key: "accessToken", label: "Access Token", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx", type: "password", required: true },
    ],
  },
  {
    id: "custom",
    name: "My Own Store",
    icon: <CustomStoreIcon />,
    color: "#f59e0b",
    bg: "#fef9e7",
    description: "Connect any store you built from scratch",
    authType: "manual",
    fields: [
      { key: "url", label: "Store URL", placeholder: "https://yourstore.com", type: "url", required: true },
      { key: "apiKey", label: "API Key (optional)", placeholder: "Leave blank if no auth needed", type: "password", required: false, helpText: "If your store has API authentication, enter the key here" },
    ],
  },
];

export default function StorePage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectedStore[]>([]);
  const [pushedProducts, setPushedProducts] = useState<PushedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);
  const [pushing, setPushing] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [trendaryoData, setTrendaryoData] = useState<{ products: number; orders: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"stores" | "products">("stores");
  const [error, setError] = useState("");

  const fetchConnections = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/store/connections?uid=${user.uid}`);
      const data = await res.json();
      setConnections(data.connections || []);
    } catch { /* ignore */ }
  }, [user]);

  const fetchPushedProducts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/store/push?uid=${user.uid}`);
      const data = await res.json();
      setPushedProducts(data.products || []);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchConnections(), fetchPushedProducts()]).then(() => setLoading(false));
  }, [user, fetchConnections, fetchPushedProducts]);

  const openConnect = (platform: Platform) => {
    setSelectedPlatform(platform);
    setFormData({});
    setError("");
    setShowConnectModal(true);
  };

  const handleConnect = async () => {
    if (!user || !selectedPlatform) return;
    setConnecting(true);
    setError("");
    try {
      const payload: Record<string, string> = {
        uid: user.uid,
        platform: selectedPlatform.id,
        name: formData.name || selectedPlatform.name,
      };
      for (const field of selectedPlatform.fields) {
        if (formData[field.key]) {
          payload[field.key] = formData[field.key];
        }
      }
      const storeUrl = formData.url || formData.storeDomain || formData.storeUrl || "";
      if (storeUrl) payload.url = storeUrl;
      const res = await fetch("/api/store/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to connect");
      setShowConnectModal(false);
      await fetchConnections();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (storeId: string) => {
    if (!user) return;
    if (!confirm("Disconnect this store?")) return;
    try {
      await fetch(`/api/store/connections?uid=${user.uid}&storeId=${storeId}`, { method: "DELETE" });
      await fetchConnections();
    } catch { /* ignore */ }
  };

  const handlePushProduct = async (store: ConnectedStore, product: PushedProduct | null) => {
    if (!user) return;
    setPushing(store.id);
    try {
      const res = await fetch("/api/store/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          storeId: store.id,
          productTitle: product?.productTitle || "New Product",
          productImage: product?.productImage || "",
          productPrice: product?.productPrice || 0,
          productUrl: product?.productUrl || "",
          productDescription: product?.productDescription || "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPushedProducts();
        await fetchConnections();
      }
    } catch { /* ignore */ }
    setPushing(null);
  };

  const handleSyncTrendaryo = async (store: ConnectedStore) => {
    if (!user || store.platform !== "trendaryo") return;
    setSyncing(store.id);
    try {
      const res = await fetch("/api/store/trendaryo", {
        method: "GET",
      });
      const data = await res.json();
      if (data.data?.products) {
        setTrendaryoData({
          products: data.data.pagination?.total || data.data.products.length,
          orders: 0,
        });
      }
      await fetchConnections();
    } catch { /* ignore */ }
    setSyncing(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Store className="w-8 h-8 text-blue-400" />
          My Stores
        </h1>
        <p className="text-gray-400 mt-2">Connect your stores to push products directly from DropShip Hub</p>
      </div>

      {/* Connected Stores Summary */}
      {connections.length > 0 && (
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-medium">
              {connections.length} store{connections.length !== 1 ? "s" : ""} connected
            </span>
            <div className="flex gap-2 ml-auto">
              {connections.map((c) => {
                const platform = PLATFORMS.find((p) => p.id === c.platform);
                return (
                  <span key={c.id} className="text-xs bg-white/10 rounded-full px-3 py-1 text-gray-300">
                    {platform?.icon} {c.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 max-w-md">
        <button
          onClick={() => setActiveTab("stores")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "stores"
              ? "bg-blue-500 text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Link2 className="w-4 h-4 inline mr-2" />
          Connected Stores
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "products"
              ? "bg-blue-500 text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Pushed Products ({pushedProducts.length})
        </button>
      </div>

      {/* Tab: Connected Stores */}
      {activeTab === "stores" && (
        <>
          {/* Connected Stores List */}
          {connections.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Your Connected Stores</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.map((store) => {
                  const platform = PLATFORMS.find((p) => p.id === store.platform);
                  const isTrendaryo = store.platform === "trendaryo";
                  return (
                    <div key={store.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: platform?.bg || "#f0f0f0" }}>
                            {platform?.icon || "🏪"}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{store.name}</h3>
                            <p className="text-gray-400 text-sm truncate max-w-[200px]">{store.url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            store.status === "connected"
                              ? "bg-green-500/20 text-green-400"
                              : store.status === "error"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}>
                            {store.status === "connected" ? "✓ Connected" : store.status === "error" ? "⚠ Error" : "Disconnected"}
                          </span>
                        </div>
                      </div>

                      {/* Trendaryo stats */}
                      {isTrendaryo && (
                        <div className="flex gap-4 mt-3 p-3 bg-white/5 rounded-lg">
                          <div className="text-center">
                            <p className="text-lg font-bold text-white">{store.productCount ?? trendaryoData?.products ?? "—"}</p>
                            <p className="text-xs text-gray-400">Products</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-white">{store.orderCount ?? trendaryoData?.orders ?? "—"}</p>
                            <p className="text-xs text-gray-400">Orders</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-4">
                        <span className="text-xs text-gray-500">
                          Connected {new Date(store.connectedAt).toLocaleDateString()}
                          {store.lastSyncAt && ` · Last sync ${new Date(store.lastSyncAt).toLocaleDateString()}`}
                        </span>
                        <div className="ml-auto flex gap-2">
                          {isTrendaryo && (
                            <button
                              onClick={() => handleSyncTrendaryo(store)}
                              disabled={syncing === store.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium hover:bg-rose-500/30 transition-all disabled:opacity-50"
                            >
                              {syncing === store.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              Sync
                            </button>
                          )}
                          <button
                            onClick={() => handlePushProduct(store, null)}
                            disabled={pushing === store.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-all disabled:opacity-50"
                          >
                            {pushing === store.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Push Product
                          </button>
                          <a
                            href={store.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg text-xs font-medium hover:bg-white/10 transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Visit
                          </a>
                          <button
                            onClick={() => handleDisconnect(store.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Platform Cards - Connect New */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              {connections.length === 0 ? "Connect Your First Store" : "Connect Another Store"}
            </h2>
            <p className="text-gray-400 text-sm mb-6">Pick your platform — we&apos;ll guide you through the simple steps</p>

            {/* Trendaryo - Featured */}
            {!connections.some((c) => c.platform === "trendaryo") && (
              <div className="mb-6">
                <button
                  onClick={() => openConnect(PLATFORMS.find((p) => p.id === "trendaryo")!)}
                  className="w-full group bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/30 rounded-xl p-6 hover:border-rose-500/50 transition-all duration-200 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: "#fff1f2" }}>
                      <TrendaryoIcon />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-bold text-lg">Trendaryo</h3>
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-xs font-medium rounded-full">Your Store</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">Full two-way sync — push products, pull orders & inventory</p>
                    </div>
                    <div className="flex items-center gap-1 text-rose-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Connect <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Other platforms */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PLATFORMS.filter((p) => p.id !== "trendaryo").map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => openConnect(platform)}
                  className="group bg-white/5 border border-white/10 rounded-xl p-5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200 text-left"
                >
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform overflow-hidden" style={{ background: platform.bg }}>
                    {platform.icon}
                  </div>
                  <h3 className="text-white font-semibold text-sm">{platform.name}</h3>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">{platform.description}</p>
                  <div className="flex items-center gap-1 mt-3 text-blue-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Connect <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tab: Pushed Products */}
      {activeTab === "products" && (
        <>
          {pushedProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No products pushed yet</h3>
              <p className="text-gray-400 mb-6">Connect a store, then push products from any page in the app</p>
              <button
                onClick={() => setActiveTab("stores")}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all"
              >
                Connect a Store
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pushedProducts.map((product) => (
                <div key={product.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-white/20 transition-all">
                  {product.productImage && (
                    <img src={product.productImage} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{product.productTitle}</h4>
                    <p className="text-gray-400 text-sm">
                      Pushed to <span className="text-blue-400">{product.storeName}</span> · ${product.productPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.status === "pushed" || product.status === "live"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {product.status === "pushed" || product.status === "live" ? "✓ Live" : "⚠ Error"}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(product.pushedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Connect Modal */}
      {showConnectModal && selectedPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConnectModal(false)}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] mx-4 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: selectedPlatform.bg }}>
                  {selectedPlatform.icon}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Connect {selectedPlatform.name}</h3>
                  <p className="text-gray-400 text-sm">{selectedPlatform.description}</p>
                </div>
              </div>
              <button onClick={() => setShowConnectModal(false)} className="text-gray-400 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Store Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Store Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome Store"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Platform Fields */}
              {selectedPlatform.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input
                    type={field.type === "password" ? "password" : field.type === "url" ? "url" : "text"}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {field.helpText && (
                    <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                  )}
                </div>
              ))}

              {/* Custom store name */}
              {selectedPlatform.id === "custom" && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-300">
                      <p className="font-medium mb-1">Custom Store Setup</p>
                      <p>If your store has an API endpoint for products, paste the URL above. If not, you can still connect — we&apos;ll store your product data for easy management.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trendaryo specific info */}
              {selectedPlatform.id === "trendaryo" && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-rose-300">
                      <p className="font-medium mb-1">Trendaryo Integration</p>
                      <p>Full two-way sync: push products from DropShip Hub to your store, pull orders and inventory data into your dashboard. Products are stored in Firestore and images in Cloudinary.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-300">
                    {selectedPlatform.id === "custom"
                      ? "Enter your store URL and any API credentials. We'll test the connection automatically."
                      : `We'll verify your ${selectedPlatform.name} credentials before connecting.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-white/10 flex-shrink-0">
              <button
                onClick={() => setShowConnectModal(false)}
                className="flex-1 py-3 bg-white/5 text-gray-300 rounded-xl font-medium hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting || selectedPlatform.fields.filter((f) => f.required).some((f) => !formData[f.key])}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Connect Store
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
