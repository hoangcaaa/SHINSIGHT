/// Badge showing KOL win/loss streak — green for wins, red for losses
interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) {
    return (
      <span className="rounded px-2 py-0.5 text-xs font-bold text-[#888780] bg-[rgba(255,255,255,0.06)]">
        -
      </span>
    );
  }

  if (streak > 0) {
    return (
      <span className="rounded px-2 py-0.5 text-xs font-bold text-[#1D9E75] bg-[rgba(29,158,117,0.12)]">
        W{streak}
      </span>
    );
  }

  return (
    <span className="rounded px-2 py-0.5 text-xs font-bold text-[#E24B4A] bg-[rgba(226,75,74,0.12)]">
      L{Math.abs(streak)}
    </span>
  );
}
