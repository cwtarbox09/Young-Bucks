export default function Loading() {
  return (
    <div className="page-container space-y-6">
      {/* Hero skeleton */}
      <div className="h-48 bg-zinc-900 rounded-xl animate-pulse" />
      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-72 bg-zinc-900 rounded-xl animate-pulse" />
        <div className="lg:col-span-2 h-72 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
