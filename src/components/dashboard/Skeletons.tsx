"use client";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rect" | "circle" | "card";
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({ className = "", variant = "rect", width, height }: SkeletonProps) {
  const baseClass = "animate-shimmer rounded-lg";

  const variantClass = {
    text: "h-3 w-full",
    rect: "h-4 w-full",
    circle: "h-10 w-10 rounded-full",
    card: "h-32 w-full rounded-2xl",
  };

  return (
    <div
      className={`${baseClass} ${variantClass[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function KPISkeleton() {
  return (
    <div className="surface-raised rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <Skeleton variant="circle" className="h-9 w-9" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-7 w-28" />
    </div>
  );
}

export function TrendingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="surface-raised rounded-2xl p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <Skeleton variant="rect" className="h-5 w-5 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
            <Skeleton variant="rect" className="h-8 w-16 rounded-lg shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function IntelligenceSkeleton() {
  return (
    <div className="surface-raised rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton variant="circle" className="h-6 w-6" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function NicheSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3].map((i) => (
        <div key={i} className="surface-raised rounded-2xl p-4 animate-pulse shrink-0 w-[300px]">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton variant="rect" className="h-5 w-8 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-12 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="surface-raised rounded-2xl p-5 animate-pulse">
      <Skeleton className="h-24 rounded-xl mb-4" />
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
