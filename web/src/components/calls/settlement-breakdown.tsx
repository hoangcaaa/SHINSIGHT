/// Compact settlement breakdown showing APT distribution after call resolution
import { formatApt } from "@/lib/utils/format-price";

interface SettlementBreakdownProps {
  totalEscrow: number;
  kolPayout: number;
  protocolFee: number;
  buyerRefund: number;
}

export function SettlementBreakdown({
  totalEscrow,
  kolPayout,
  protocolFee,
  buyerRefund,
}: SettlementBreakdownProps) {
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0C0B09] p-3">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-[#888780]">
        Settlement
      </p>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#888780]">Total Pool</span>
          <span className="font-semibold text-[#F5F5F0]">
            {formatApt(totalEscrow)} APT
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#888780]">KOL Payout</span>
          <span className="font-semibold text-[#1D9E75]">
            {formatApt(kolPayout)} APT
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#888780]">Protocol Fee</span>
          <span className="font-semibold text-[#EF9F27]">
            {formatApt(protocolFee)} APT
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#888780]">Buyer Refund</span>
          <span className="font-semibold text-[#F5F5F0]">
            {formatApt(buyerRefund)} APT
          </span>
        </div>
      </div>
    </div>
  );
}
