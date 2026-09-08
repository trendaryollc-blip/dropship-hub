"use client";

import { useState, useEffect } from "react";
import { Star, ShoppingCart, ExternalLink } from "lucide-react";

interface StickyProductBarProps {
  title: string;
  price: number | null;
  image: string | null;
  rating: number | null;
  reviews: number | null;
  source: string;
  link: string;
  heroRef: React.RefObject<HTMLDivElement | null>;
}

export default function StickyProductBar({ title, price, image, rating, reviews, source, link, heroRef }: StickyProductBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroRef]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 animate-slide-down-fade">
      <div className="glass border-b border-border/50 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
          {image && (
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-surface border border-border/50">
              <img src={image} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{title}</p>
            <div className="flex items-center gap-2">
              {price != null && (
                <span className="text-xs font-bold text-emerald-400">${price.toFixed(2)}</span>
              )}
              {rating != null && (
                <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                  <Star className="h-2.5 w-2.5 fill-current" /> {rating.toFixed(1)}
                </span>
              )}
              {reviews != null && (
                <span className="text-[10px] text-muted-foreground">({reviews.toLocaleString()})</span>
              )}
            </div>
          </div>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors shrink-0"
          >
            <ShoppingCart className="h-3 w-3" />
            <span className="hidden sm:inline">View on {source.replace("_", " ")}</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
