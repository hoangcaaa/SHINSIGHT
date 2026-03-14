/// Shimmer loading placeholder matching revealed call card dimensions
export function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#161511]">
      {/* Verdict stripe placeholder */}
      <div className="h-7 w-full bg-[rgba(255,255,255,0.06)]" />

      <div className="flex flex-col gap-3 p-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="h-6 w-20 rounded-full bg-[rgba(255,255,255,0.06)]" />
          <div className="h-6 w-14 rounded bg-[rgba(255,255,255,0.06)]" />
        </div>

        {/* Target price box */}
        <div className="h-14 w-full rounded-lg bg-[rgba(255,255,255,0.06)]" />

        {/* Settlement breakdown */}
        <div className="h-24 w-full rounded-lg bg-[rgba(255,255,255,0.06)]" />

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-2">
          <div className="h-3 w-8 rounded bg-[rgba(255,255,255,0.06)]" />
          <div className="h-3 w-24 rounded bg-[rgba(255,255,255,0.06)]" />
        </div>
      </div>
    </div>
  );
}
