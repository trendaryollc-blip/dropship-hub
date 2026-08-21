"use client";

import Link from "next/link";
import { ArrowLeft, Globe, Search } from "lucide-react";

export default function ProductDetailPage() {
  return (
    <div className="max-w-4xl mx-auto text-center py-20">
      <div className="glass rounded-2xl p-12">
        <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          Search for Products
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Use the product search to find real products across multiple platforms. Click on any product to view details.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/products"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all"
          >
            <Search className="h-4 w-4" />
            Search Products
          </Link>
          <Link
            href="/platforms"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            <Globe className="h-4 w-4" />
            Browse Platforms
          </Link>
        </div>
      </div>
    </div>
  );
}
