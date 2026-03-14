"use client";
/// Sealed call card — shows asset, direction, stats, countdown, unlock button
import type { Call, EscrowState } from "@/lib/types";
import { AssetBadge } from "@/components/calls/asset-badge";
import { CountdownTimer } from "@/components/calls/countdown-timer";
import { UnlockButton } from "@/components/calls/unlock-button";
import { formatApt } from "@/lib/utils/format-price";

interface CallCardSealedProps {
  call: Call;
  escrow: EscrowState;
}

export function CallCardSealed({ call, escrow }: CallCardSealedProps) {
  const directionUp = call.direction;

  return (
    <article
      className="group relative flex flex-col gap-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#161511] p-4 transition-all duration-200"
      style={{
        boxShadow: "0 0 0 0 transparent",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 0 0 1px #EF9F27, 0 0 16px 2px rgba(239,159,39,0.18)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 0 0 0 transparent";
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <AssetBadge assetId={call.asset} />
        <span
          className={`text-xl font-bold ${directionUp ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}
        >
          {directionUp ? "↑" : "↓"}
        </span>
      </div>

      {/* Sealed body with diagonal hatching */}
      <div className="relative flex h-20 items-center justify-center overflow-hidden rounded-lg border border-[rgba(255,255,255,0.06)]">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, #EF9F27 0, #EF9F27 1px, transparent 0, transparent 50%)",
            backgroundSize: "8px 8px",
          }}
        />
        <span className="relative z-10 text-sm font-bold tracking-widest text-[#888780]">
          SEALED
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#888780]">
            Buyers
          </p>
          <p className="text-sm font-semibold text-[#F5F5F0]">
            {escrow.buyerCount}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#888780]">
            Pool
          </p>
          <p className="text-sm font-semibold text-[#F5F5F0]">
            {formatApt(escrow.totalDeposited)} APT
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#888780]">
            Unlock
          </p>
          <p className="text-sm font-semibold text-[#EF9F27]">
            {formatApt(call.unlock_price)} APT
          </p>
        </div>
      </div>

      {/* Footer: countdown */}
      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-2">
        <span className="text-[10px] uppercase tracking-wider text-[#888780]">
          Reveals in
        </span>
        <CountdownTimer revealTimestamp={call.reveal_timestamp} />
      </div>

      {/* Unlock button */}
      {!call.is_revealed && <UnlockButton call={call} />}
    </article>
  );
}
