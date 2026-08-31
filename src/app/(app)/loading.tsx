export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-surface" />
          <div className="h-4 w-72 rounded-lg bg-surface" />
        </div>
        <div className="h-9 w-24 rounded-xl bg-surface" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-surface" />
              <div className="h-4 w-4 rounded bg-surface" />
            </div>
            <div className="h-8 w-24 rounded-lg bg-surface" />
            <div className="h-3 w-16 rounded bg-surface" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-5 space-y-4">
          <div className="h-5 w-32 rounded bg-surface" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface/50">
                <div className="h-10 w-10 rounded-lg bg-surface shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-surface" />
                  <div className="h-3 w-1/2 rounded bg-surface" />
                </div>
                <div className="h-6 w-16 rounded-lg bg-surface" />
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="h-5 w-28 rounded bg-surface" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-surface/50" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
