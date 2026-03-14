"use client";
/// Grid layout for sealed call cards — responsive auto-fill columns
import type { Call } from "@/lib/types";
import { CallCardSealed } from "@/components/calls/call-card-sealed";
import { useCallEscrow } from "@/lib/hooks/use-call-escrow";

interface CallCardGridProps {
  calls: Call[];
}

/** Individual card that fetches its own escrow state */
function CardWithEscrow({ call }: { call: Call }) {
  const escrow = useCallEscrow(call.call_id_onchain);
  return <CallCardSealed call={call} escrow={escrow} />;
}

export function CallCardGrid({ calls }: CallCardGridProps) {
  if (calls.length === 0) {
    return (
      <div className="py-24 text-center text-[#888780]">
        No active calls yet. Be the first to seal one.
      </div>
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
    >
      {calls.map((call) => (
        <CardWithEscrow key={call.id} call={call} />
      ))}
    </div>
  );
}
