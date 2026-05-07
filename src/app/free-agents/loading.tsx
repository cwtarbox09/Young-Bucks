export default function Loading() {
  return (
    <div className="page-container space-y-6">
      <div className="h-16 bg-zinc-900 rounded-xl animate-pulse" />
      <div className="h-10 bg-zinc-900 rounded-xl animate-pulse" />
      <div className="h-12 bg-zinc-900 rounded-xl animate-pulse" />
      <div className="space-y-2">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-14 bg-zinc-900 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
