"use client";

export default function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-surface-hover animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-3.5 bg-surface-hover rounded-lg w-32 animate-pulse" />
          <div className="h-2.5 bg-surface-hover rounded-lg w-48 animate-pulse" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="h-3 bg-surface-hover rounded-lg w-full animate-pulse" />
          <div className="h-3 bg-surface-hover rounded-lg w-3/4 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
