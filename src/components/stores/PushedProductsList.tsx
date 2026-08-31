"use client";

import Link from "next/link";
import { Package, ExternalLink } from "lucide-react";

export interface PushedProduct {
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

interface Props {
  products: PushedProduct[];
}

export default function PushedProductsList({ products }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-display text-xl font-semibold text-foreground mb-2">No products pushed yet</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Connect a store, then push products from any page in the app
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all"
        >
          Find Products to Push
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {products.map((product) => (
        <div
          key={product.id}
          className="glass rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-accent/30 transition-all"
        >
          {product.productImage && (
            <img
              src={product.productImage}
              alt=""
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate">{product.productTitle}</h4>
            <p className="text-xs text-muted-foreground">
              Pushed to <span className="text-accent">{product.storeName}</span> · ${product.productPrice.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                product.status === "pushed" || product.status === "live"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "bg-red-400/10 text-red-400"
              }`}
            >
              {product.status === "pushed" || product.status === "live" ? "✓ LIVE" : "⚠ ERROR"}
            </span>
            {product.productUrl && (
              <a
                href={product.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
