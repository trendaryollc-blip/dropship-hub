"use client";

import { useRouter } from "next/navigation";
import { Package, Heart, Star, ArrowLeft, Trash2 } from "lucide-react";
import Image from "next/image";
import { useSavedProducts } from "@/components/saved/SavedProductsProvider";

const platformIcons: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", keepa: "\ud83d\udcca",
  walmart: "\ud83c\udfea", temu: "\ud83d\udd25", shein: "\ud83d\udc57",
  etsy: "\ud83c\udfa8", alibaba: "\ud83c\udfed", banggood: "\u26a1", dhgate: "\ud83d\udd17",
};

export default function SavedPage() {
  const router = useRouter();
  const { savedProducts, toggleSave, clearSaved } = useSavedProducts();

  const openProduct = (p: (typeof savedProducts)[number]) => {
    sessionStorage.setItem("selectedProduct", JSON.stringify({
      id: p.id,
      title: p.title,
      price: p.price,
      image: p.image,
      images: p.images || (p.image ? [p.image] : []),
      link: p.link,
      source: p.source,
      rating: p.rating,
      reviews: p.reviews,
    }));
    const params = new URLSearchParams({ t: p.title, src: p.source });
    if (p.price != null) params.set("p", String(p.price));
    if (p.image) params.set("img", p.image);
    if (p.link) params.set("link", p.link);
    if (p.rating != null) params.set("r", String(p.rating));
    if (p.reviews != null) params.set("rev", String(p.reviews));
    router.push(`/products/${encodeURIComponent(p.id)}?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
            <Heart className="h-7 w-7 text-accent fill-current" /> Saved Products
          </h1>
          <p className="text-muted-foreground text-sm">
            {savedProducts.length === 0
              ? "Products you save will appear here for later viewing."
              : `${savedProducts.length} saved product${savedProducts.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {savedProducts.length > 0 && (
          <button
            onClick={clearSaved}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-red-400 hover:border-red-400/30 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
      </div>

      {savedProducts.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Package className="h-14 w-14 text-muted-foreground/25 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No saved products yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Tap the heart on any product card to save it here for later.
          </p>
          <button
            onClick={() => router.push("/products")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Find Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {savedProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => openProduct(p)}
              className="glass-card-animated rounded-2xl overflow-hidden group block cursor-pointer"
            >
              <div className="aspect-square bg-surface relative overflow-hidden">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.title}
                    width={400}
                    height={400}
                    unoptimized
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                    <Package className="h-12 w-12" />
                  </div>
                )}
                <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm flex items-center gap-1 max-w-[calc(100%-16px)] truncate">
                  {platformIcons[p.source] || "\ud83d\udd17"} {p.source}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSave(p);
                  }}
                  className="absolute top-2 right-2 p-2.5 rounded-lg bg-accent text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Remove from saved"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                  {p.title}
                </h3>
                <div className="flex items-center justify-between">
                  {p.price != null ? (
                    <span className="text-lg font-bold text-accent">${p.price.toFixed(2)}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Price N/A</span>
                  )}
                  {p.rating != null && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 text-amber-400 fill-current" />
                      {p.rating.toFixed(1)}
                      {p.reviews != null && <span>({p.reviews.toLocaleString()})</span>}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
