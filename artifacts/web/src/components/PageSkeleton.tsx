export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-14 border-b border-border/40 bg-background/80 backdrop-blur-sm flex items-center px-6 gap-4">
        <div className="h-7 w-7 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </div>
      <div className="flex flex-1">
        <div className="hidden md:flex flex-col w-56 border-r border-border/40 bg-background/60 p-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-8 rounded-md bg-muted animate-pulse"
              style={{ opacity: 1 - i * 0.08 }}
            />
          ))}
        </div>
        <main className="flex-1 p-6 space-y-4">
          <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded bg-muted animate-pulse opacity-60" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            <div className="h-52 rounded-xl bg-muted animate-pulse" />
            <div className="h-52 rounded-xl bg-muted animate-pulse opacity-70" />
          </div>
        </main>
      </div>
    </div>
  );
}
