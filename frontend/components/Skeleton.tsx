/** Grey placeholder shapes shown while content loads, so the page has its
 *  final layout immediately instead of a "Loading..." line. */

function Bar({ className }: { className: string }) {
  return <div className={`bg-neutral-200 rounded-full ${className}`} />;
}

export function IdeaCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-5 animate-pulse" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-neutral-200" />
        <div className="flex-1 space-y-2">
          <Bar className="h-3 w-1/3" />
          <Bar className="h-2.5 w-1/5" />
        </div>
      </div>
      <Bar className="mt-4 h-4 w-2/3" />
      <div className="mt-3 space-y-2">
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-11/12" />
        <Bar className="h-3 w-3/5" />
      </div>
      <div className="mt-5 flex gap-4">
        <Bar className="h-7 w-16" />
        <Bar className="h-7 w-16" />
        <Bar className="h-7 w-20" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <IdeaCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 animate-pulse" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-neutral-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Bar className="h-3 w-2/5" />
            <Bar className="h-2.5 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
