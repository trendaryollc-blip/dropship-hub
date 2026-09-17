"use client";

export function RateCardSkeleton() {
  return (
    <div className="glass rounded-xl p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface" />
          <div className="space-y-1.5">
            <div className="w-24 h-3 rounded bg-surface" />
            <div className="w-14 h-2 rounded bg-surface" />
          </div>
        </div>
        <div className="space-y-1.5 text-right">
          <div className="w-16 h-4 rounded bg-surface ml-auto" />
          <div className="w-8 h-2 rounded bg-surface ml-auto" />
        </div>
      </div>
      <div className="flex gap-1.5 mb-3">
        <div className="w-16 h-4 rounded bg-surface" />
        <div className="w-16 h-4 rounded bg-surface" />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded-lg bg-surface/50 space-y-1">
          <div className="w-12 h-2 rounded bg-surface" />
          <div className="w-20 h-3 rounded bg-surface" />
        </div>
        <div className="p-2 rounded-lg bg-surface/50 space-y-1">
          <div className="w-12 h-2 rounded bg-surface" />
          <div className="w-16 h-3 rounded bg-surface" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="w-16 h-4 rounded bg-surface" />
        <div className="w-14 h-4 rounded bg-surface" />
        <div className="w-18 h-4 rounded bg-surface" />
      </div>
    </div>
  );
}

export function RateComparisonSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <RateCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="glass rounded-xl p-4 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-40 h-4 rounded bg-surface" />
        <div className="w-24 h-3 rounded bg-surface" />
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 rounded-full bg-surface" />
        <div className="flex-1 h-2 rounded bg-surface" />
        <div className="w-3 h-3 rounded-full bg-surface" />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-2 rounded-lg bg-surface/50 space-y-1">
            <div className="w-12 h-2 rounded bg-surface mx-auto" />
            <div className="w-20 h-3 rounded bg-surface mx-auto" />
            <div className="w-10 h-2 rounded bg-surface mx-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface/30">
            <div className="w-3 h-3 rounded bg-surface" />
            <div className="flex-1 space-y-1">
              <div className="w-32 h-2 rounded bg-surface" />
              <div className="w-24 h-2 rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-xl p-3 text-center space-y-1.5">
            <div className="w-16 h-2 rounded bg-surface mx-auto" />
            <div className="w-20 h-4 rounded bg-surface mx-auto" />
          </div>
        ))}
      </div>
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="w-28 h-3 rounded bg-surface" />
        <div className="h-3 rounded-full bg-surface" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-surface" />
              <div className="w-12 h-2 rounded bg-surface" />
            </div>
          ))}
        </div>
      </div>
      <div className="glass rounded-xl p-4 space-y-2">
        <div className="w-24 h-3 rounded bg-surface" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg bg-surface/50 space-y-2">
            <div className="flex justify-between">
              <div className="w-24 h-3 rounded bg-surface" />
              <div className="w-16 h-3 rounded bg-surface" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-0.5">
                  <div className="w-8 h-1.5 rounded bg-surface" />
                  <div className="w-10 h-2.5 rounded bg-surface" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScoreBreakdownSkeleton() {
  return (
    <div className="glass rounded-xl p-4 animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-between">
            <div className="w-20 h-2.5 rounded bg-surface" />
            <div className="w-10 h-2.5 rounded bg-surface" />
          </div>
          <div className="h-2 rounded-full bg-surface" />
        </div>
      ))}
    </div>
  );
}
