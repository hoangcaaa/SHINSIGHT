/// Full-width verdict bar shown at top of revealed call cards
interface VerdictStripeProps {
  verdict: string;
}

const VERDICT_CONFIG: Record<string, { color: string; label: string }> = {
  TRUE: { color: "#1D9E75", label: "TRUE — Call Verified" },
  FALSE: { color: "#E24B4A", label: "FALSE — Call Missed" },
  EXPIRED: { color: "#888780", label: "EXPIRED — No Verdict" },
};

export function VerdictStripe({ verdict }: VerdictStripeProps) {
  const config = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.EXPIRED;

  return (
    <div
      className="flex w-full items-center justify-center rounded-t-xl px-4 py-1.5"
      style={{ backgroundColor: config.color }}
    >
      <span className="text-xs font-bold tracking-widest text-white">
        {config.label}
      </span>
    </div>
  );
}
