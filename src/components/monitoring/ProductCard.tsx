"use client";

import { useState } from "react";
import {
  TrendingDown,
  TrendingUp,
  Trash2,
  ExternalLink,
  Clock,
  Settings,
  ChevronDown,
  ChevronUp,
  Target,
} from "lucide-react";
import Image from "next/image";
import Sparkline from "@/components/ui/Sparkline";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PriceHistoryChart from "./PriceHistoryChart";
import CompetitorPanel from "./CompetitorPanel";
import RepricingRuleEditor from "./RepricingRuleEditor";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";
import type { MonitoredProduct } from "@/lib/monitoring/types";

interface ProductCardProps {
  product: MonitoredProduct;
  onRemove: (id: string) => void;
  onCheck: (id: string) => void;
  onUpdate: () => void;
  removingId: string | null;
}

export default function ProductCard({ product, onRemove, onCheck, onUpdate, removingId }: ProductCardProps) {
  const { error: toastError } = useToast();
  const [editingProduct, setEditingProduct] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(String(product.priceDropThreshold || 5));
  const [autoDelistValue, setAutoDelistValue] = useState(product.autoDelist || false);
  const [expandedSection, setExpandedSection] = useState<"settings" | "chart" | "competitors" | "repricing" | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [checkingProduct, setCheckingProduct] = useState(false);

  const priceChange = product.priceHistory.length > 1
    ? ((product.priceHistory[product.priceHistory.length - 1].price - product.priceHistory[0].price) / product.priceHistory[0].price) * 100
    : 0;
  const sparkData = product.priceHistory.map((h) => h.price);
  const unreadCount = product.alerts.filter((a) => !a.read).length;

  const handleUpdateThreshold = async () => {
    try {
      await safeFetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateThreshold",
          monitoredId: product.id,
          priceDropThreshold: Number(thresholdValue) || 5,
          autoDelist: autoDelistValue,
        }),
      });
      setEditingProduct(false);
      onUpdate();
    } catch {
      toastError("Failed to update settings");
    }
  };

  const handleCheck = async () => {
    setCheckingProduct(true);
    try {
      await safeFetch("/api/monitoring/auto-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitoredId: product.id }),
      });
      onUpdate();
    } catch {
      toastError("Failed to check product");
    } finally {
      setCheckingProduct(false);
    }
  };

  const toggleSection = (section: typeof expandedSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <>
      <div className="glass rounded-xl p-4 hover:border-accent/20 transition-all">
        <div className="flex items-start gap-4">
          {product.productImage && (
            <Image
              src={product.productImage}
              alt={product.productTitle}
              width={56}
              height={56}
              className="h-14 w-14 rounded-lg object-cover border border-border shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{product.productTitle}</h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground capitalize">{product.source}</span>
                  <span className="text-[10px] text-muted-foreground/40">·</span>
                  <span className={`text-[10px] font-medium ${product.stockStatus === "in_stock" ? "text-emerald-400" : product.stockStatus === "out_of_stock" ? "text-red-400" : "text-muted-foreground"}`}>
                    {product.stockStatus === "in_stock" ? "In Stock" : product.stockStatus === "out_of_stock" ? "Out of Stock" : "Unknown"}
                  </span>
                  {product.autoDelist && (
                    <>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-accent font-medium">Auto-Delist</span>
                    </>
                  )}
                  {product.priceDropThreshold && product.priceDropThreshold !== 5 && (
                    <>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground">Threshold: {product.priceDropThreshold}%</span>
                    </>
                  )}
                  {product.repricingRule?.enabled && (
                    <>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-purple-400 font-medium">
                        {product.repricingRule.type === "maintain_margin" ? `${product.repricingRule.value}% margin` :
                         product.repricingRule.type === "undercut" ? `${product.repricingRule.value}% undercut` :
                         `$${product.repricingRule.value} fixed`}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCheck}
                  disabled={checkingProduct}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/10 transition-all disabled:opacity-50"
                  title="Check Price"
                >
                  <Clock className={`h-3.5 w-3.5 ${checkingProduct ? "animate-pulse" : ""}`} />
                </button>
                {product.sourceUrl && (
                  <a
                    href={product.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={removingId === product.id}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <div>
                <p className="text-lg font-bold text-foreground">${product.currentPrice.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">Current</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">${product.lowestPrice.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">Lowest</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">${product.highestPrice.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">Highest</p>
              </div>
              {priceChange !== 0 && (
                <div className={`flex items-center gap-1 ${priceChange < 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {priceChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  <span className="text-xs font-semibold">{priceChange > 0 ? "+" : ""}{priceChange.toFixed(1)}%</span>
                </div>
              )}
              <Sparkline data={sparkData} width={80} height={32} positive={priceChange >= 0} />
            </div>

            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Last checked: {new Date(product.lastChecked).toLocaleString()}</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-semibold">
                  {unreadCount} alert{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <button
                onClick={() => toggleSection("settings")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  expandedSection === "settings" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                <Settings className="h-3 w-3" />
                Settings
              </button>
              <button
                onClick={() => toggleSection("chart")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  expandedSection === "chart" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                <TrendingDown className="h-3 w-3" />
                History
              </button>
              {product.competitorUrls && product.competitorUrls.length > 0 && (
                <button
                  onClick={() => toggleSection("competitors")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    expandedSection === "competitors" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-surface"
                  }`}
                >
                  <Target className="h-3 w-3" />
                  Competitors
                </button>
              )}
              <button
                onClick={() => toggleSection("repricing")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  expandedSection === "repricing" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                {expandedSection === "repricing" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Repricing
              </button>
            </div>

            {expandedSection === "settings" && (
              <div className="mt-3 p-3 rounded-lg bg-surface border border-border space-y-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-muted-foreground">Price Drop Threshold:</label>
                    <select
                      value={thresholdValue}
                      onChange={(e) => setThresholdValue(e.target.value)}
                      className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground"
                    >
                      <option value="2">2%</option>
                      <option value="3">3%</option>
                      <option value="5">5%</option>
                      <option value="10">10%</option>
                      <option value="15">15%</option>
                      <option value="20">20%</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-muted-foreground">Auto-Delist on Stock-Out:</label>
                    <button
                      onClick={() => setAutoDelistValue(!autoDelistValue)}
                      className={`w-8 h-4 rounded-full transition-all ${autoDelistValue ? "bg-accent" : "bg-border"}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-all ${autoDelistValue ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  <button
                    onClick={handleUpdateThreshold}
                    className="px-3 py-1 rounded-lg bg-accent text-white text-[10px] font-semibold hover:bg-accent/90 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {expandedSection === "chart" && (
              <div className="mt-3">
                <PriceHistoryChart
                  history={product.priceHistory}
                  currentPrice={product.currentPrice}
                  lowestPrice={product.lowestPrice}
                  highestPrice={product.highestPrice}
                />
              </div>
            )}

            {expandedSection === "competitors" && (
              <div className="mt-3 p-3 rounded-lg bg-surface border border-border">
                <CompetitorPanel
                  monitoredId={product.id}
                  competitorUrls={product.competitorUrls || []}
                  competitorSnapshots={product.competitorSnapshots}
                  ourPrice={product.currentPrice}
                  onUpdate={onUpdate}
                />
              </div>
            )}

            {expandedSection === "repricing" && (
              <div className="mt-3 p-3 rounded-lg bg-surface border border-border">
                <RepricingRuleEditor
                  monitoredId={product.id}
                  currentRule={product.repricingRule}
                  supplierPrice={product.currentPrice}
                  currentSellPrice={product.currentPrice}
                  onSave={onUpdate}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Remove from Monitor"
        description={`Stop monitoring "${product.productTitle}"? You will no longer receive price or stock alerts for this product.`}
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onRemove(product.id);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
