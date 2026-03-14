"use client";
/// Responsive table listing all KOLs with sticky header and accuracy rankings
import type { KolStats } from "@/lib/types";
import { OracleRow } from "@/components/oracles/oracle-row";

interface OracleTableProps {
  stats: KolStats[];
}

export function OracleTable({ stats }: OracleTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.08)]">
      <table className="w-full min-w-[640px] text-left">
        <thead className="sticky top-0 z-10 bg-[#161511]">
          <tr className="border-b border-[rgba(255,255,255,0.08)]">
            <th className="py-3 pl-4 pr-2 text-[10px] uppercase tracking-wider text-[#888780]">
              #
            </th>
            <th className="px-2 py-3 text-[10px] uppercase tracking-wider text-[#888780]">
              Acc.
            </th>
            <th className="px-2 py-3 text-[10px] uppercase tracking-wider text-[#888780]">
              Oracle
            </th>
            <th className="px-2 py-3 text-center text-[10px] uppercase tracking-wider text-[#888780]">
              Calls
            </th>
            <th className="px-2 py-3 text-center text-[10px] uppercase tracking-wider text-[#888780]">
              W / L / E
            </th>
            <th className="px-2 py-3 text-center text-[10px] uppercase tracking-wider text-[#888780]">
              Streak
            </th>
            <th className="py-3 pl-2 pr-4 text-right text-[10px] uppercase tracking-wider text-[#888780]">
              Earned
            </th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <OracleRow key={s.kol_address} stats={s} rank={i + 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
