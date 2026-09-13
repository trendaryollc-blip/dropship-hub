"use client";

export function OrderCardSkeleton() {
  return (
    <div className="glass rounded-xl border-l-4 border-l-gray-400 p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-surface/50 animate-pulse" />
            <div className="h-4 w-24 rounded bg-surface/50 animate-pulse" />
            <div className="h-5 w-16 rounded-full bg-surface/50 animate-pulse" />
          </div>
          <div className="h-3 w-40 mt-2 rounded bg-surface/50 animate-pulse" />
        </div>
        <div className="text-right">
          <div className="h-5 w-16 rounded bg-surface/50 animate-pulse ml-auto" />
          <div className="h-2 w-10 rounded bg-surface/50 animate-pulse mt-1 ml-auto" />
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-surface/50">
            <div className="w-10 h-10 rounded-lg bg-surface/50 animate-pulse" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="h-3 w-32 rounded bg-surface/50 animate-pulse" />
              <div className="h-2 w-24 rounded bg-surface/50 animate-pulse" />
            </div>
            <div className="h-5 w-12 rounded bg-surface/50 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 p-2 rounded-lg bg-surface/50">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center space-y-1">
            <div className="h-2 w-12 rounded bg-surface/50 animate-pulse mx-auto" />
            <div className="h-3 w-14 rounded bg-surface/50 animate-pulse mx-auto" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-surface/50">
        <div className="flex-1 space-y-1">
          <div className="h-2 w-10 rounded bg-surface/50 animate-pulse" />
          <div className="h-3 w-40 rounded bg-surface/50 animate-pulse" />
        </div>
        <div className="w-7 h-7 rounded-lg bg-surface/50 animate-pulse" />
      </div>

      <div className="flex gap-2">
        <div className="h-9 w-24 rounded-lg bg-surface/50 animate-pulse" />
        <div className="h-9 w-28 rounded-lg bg-surface/50 animate-pulse" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-surface/50 animate-pulse" />
          <div className="h-8 w-20 rounded-lg bg-surface/50 animate-pulse" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              {["w-10", "w-24", "w-20", "w-16", "w-20", "w-16", "w-20"].map((w, i) => (
                <th key={i} className="text-left py-3 px-4">
                  <div className={`h-3 ${w} rounded bg-surface/50 animate-pulse`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-white/5">
                <td className="py-3 px-4">
                  <div className="w-5 h-5 rounded bg-surface/50 animate-pulse" />
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1">
                    <div className="h-3 w-20 rounded bg-surface/50 animate-pulse" />
                    <div className="h-2 w-16 rounded bg-surface/50 animate-pulse" />
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="h-5 w-14 rounded bg-surface/50 animate-pulse" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-3 w-20 rounded bg-surface/50 animate-pulse" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-6 w-16 rounded-full bg-surface/50 animate-pulse" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-3 w-14 rounded bg-surface/50 animate-pulse" />
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <div className="h-7 w-7 rounded-lg bg-surface/50 animate-pulse" />
                    <div className="h-7 w-7 rounded-lg bg-surface/50 animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded bg-surface/50 animate-pulse" />
              <div className="h-3 w-20 rounded bg-surface/50 animate-pulse" />
            </div>
            <div className="h-7 w-16 rounded bg-surface/50 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-28 rounded bg-surface/50 animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-surface/50 animate-pulse" />
        </div>
        <div className="flex items-end gap-2 h-40">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end h-full gap-1">
              <div
                className="w-full bg-surface/50 rounded-t animate-pulse"
                style={{ height: `${20 + Math.random() * 60}%` }}
              />
              <div
                className="w-full bg-surface/50 animate-pulse"
                style={{ height: `${5 + Math.random() * 15}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="glass rounded-xl p-5">
            <div className="h-4 w-32 rounded bg-surface/50 animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface/50 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-3/4 rounded bg-surface/50 animate-pulse" />
                    <div className="h-2 w-1/2 rounded bg-surface/50 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-9 rounded-lg bg-surface/50 animate-pulse flex-shrink-0 ${i === 1 ? "w-28" : "w-20"}`}
          />
        ))}
      </div>

      <div className="glass rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 rounded bg-surface/50 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-lg bg-surface/50 animate-pulse" />
            <div className="h-8 w-20 rounded-lg bg-surface/50 animate-pulse" />
          </div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface/30">
              <div className="w-10 h-10 rounded-lg bg-surface/50 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-48 rounded bg-surface/50 animate-pulse" />
                <div className="h-2 w-32 rounded bg-surface/50 animate-pulse" />
              </div>
              <div className="h-6 w-16 rounded-full bg-surface/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-surface/50 animate-pulse" />
          <div className="h-4 w-40 rounded bg-surface/50 animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-surface/50 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-2 w-16 rounded bg-surface/50 animate-pulse" />
              <div className="h-5 w-24 rounded bg-surface/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-xl p-5 space-y-4">
          <div className="h-4 w-28 rounded bg-surface/50 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-surface/50 animate-pulse flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-40 rounded bg-surface/50 animate-pulse" />
                  <div className="h-2 w-28 rounded bg-surface/50 animate-pulse" />
                </div>
                <div className="h-3 w-16 rounded bg-surface/50 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-xl p-5 space-y-3">
            <div className="h-4 w-24 rounded bg-surface/50 animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-3 w-20 rounded bg-surface/50 animate-pulse" />
                  <div className="flex-1 h-3 w-full rounded bg-surface/50 animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="h-4 w-28 rounded bg-surface/50 animate-pulse mb-3" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="p-2 rounded-lg bg-surface/30">
                  <div className="h-3 w-32 rounded bg-surface/50 animate-pulse" />
                  <div className="h-2 w-24 rounded bg-surface/50 animate-pulse mt-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-surface/50 animate-pulse w-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
