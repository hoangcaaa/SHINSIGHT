"use client";
/// Full revealed call card showing verdict, asset, target price, and settlement
import type { Call } from "@/lib/types";
import { VerdictStripe } from "@/components/calls/verdict-stripe";
import { SettlementBreakdown } from "@/components/calls/settlement-breakdown";
import { AssetBadge } from "@/components/calls/asset-badge";
import { formatUsdPrice, truncateAddress } from "@/lib/utils/format-price";

interface CallCardRevealedProps {
  call: Call;
}

function statusToVerdict(status: string): string {
  if (status === "settled_true") return "TRUE";
  if (status === "settled_false") return "FALSE";
  return "EXPIRED";
}

export function CallCardRevealed({ call }: CallCardRevealedProps) {
  const verdict = statusToVerdict(call.status);
  const directionUp = call.direction;

  // Derive settlement amounts from unlock_price as proxy (real data from escrow)
  const totalEscrow = call.unlock_price ?? 0;
  const kolPayout = Math.floor(totalEscrow * 0.9);
  const protocolFee = Math.floor(totalEscrow * 0.05);
  const buyerRefund = totalEscrow - kolPayout - protocolFee;

  return (
    <article className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#161511]">
      <VerdictStripe verdict={verdict} />

      <div className="flex flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <AssetBadge assetId={call.asset} />
          <span
            className={`text-xl font-bold ${directionUp ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}
          >
            {directionUp ? "↑ LONG" : "↓ SHORT"}
          </span>
        </div>

        {/* Target price */}
        {call.target_price !== null && (
          <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0C0B09] px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[#888780]">
              Target Price
            </p>
            <p className="text-lg font-bold text-[#F5F5F0]">
              {formatUsdPrice(call.target_price)}
            </p>
          </div>
        )}

        {/* Settlement breakdown */}
        <SettlementBreakdown
          totalEscrow={totalEscrow}
          kolPayout={kolPayout}
          protocolFee={protocolFee}
          buyerRefund={buyerRefund}
        />

        {/* KOL address */}
        <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-2">
          <span className="text-[10px] uppercase tracking-wider text-[#888780]">
            KOL
          </span>
          <span className="font-mono text-xs text-[#888780]">
            {truncateAddress(call.kol_address)}
          </span>
        </div>
      </div>
    </article>
  );
}
