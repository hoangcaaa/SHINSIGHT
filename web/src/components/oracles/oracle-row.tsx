/// Table row displaying a single KOL's stats: accuracy, calls, streak, earnings
import type { KolStats } from "@/lib/types";
import { AccuracyRing } from "@/components/oracles/accuracy-ring";
import { StreakBadge } from "@/components/oracles/streak-badge";
import { truncateAddress, formatApt } from "@/lib/utils/format-price";

interface OracleRowProps {
  stats: KolStats;
  rank: number;
}

export function OracleRow({ stats, rank }: OracleRowProps) {
  const accuracy =
    stats.total_calls > 0 ? (stats.true_calls / stats.total_calls) * 100 : 0;

  return (
    <tr className="border-b border-[rgba(255,255,255,0.06)] transition-colors hover:bg-[rgba(255,255,255,0.02)]">
      <td className="py-3 pl-4 pr-2 text-xs text-[#888780]">{rank}</td>
      <td className="px-2 py-3">
        <AccuracyRing accuracy={accuracy} />
      </td>
      <td className="px-2 py-3 font-mono text-sm text-[#F5F5F0]">
        {truncateAddress(stats.kol_address)}
      </td>
      <td className="px-2 py-3 text-center text-sm text-[#F5F5F0]">
        {stats.total_calls}
      </td>
      <td className="px-2 py-3 text-center text-xs">
        <span className="text-[#1D9E75]">{stats.true_calls}W</span>
        {" / "}
        <span className="text-[#E24B4A]">{stats.false_calls}L</span>
        {" / "}
        <span className="text-[#888780]">{stats.expired_calls}E</span>
      </td>
      <td className="px-2 py-3 text-center">
        <StreakBadge streak={stats.current_streak} />
      </td>
      <td className="py-3 pl-2 pr-4 text-right text-sm font-semibold text-[#EF9F27]">
        {formatApt(stats.total_escrow_earned)} APT
      </td>
    </tr>
  );
}
