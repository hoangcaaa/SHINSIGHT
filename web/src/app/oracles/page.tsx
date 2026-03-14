"use client";
/// Oracles leaderboard page — ranked table of KOLs by accuracy
import { useKolStats } from "@/lib/hooks/use-kol-stats";
import { OracleTable } from "@/components/oracles/oracle-table";
import { EmptyState } from "@/components/shared/empty-state";

export default function OraclesPage() {
  const { stats, loading } = useKolStats();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[#F5F5F0]">Oracles</h1>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 w-full rounded-lg bg-[rgba(255,255,255,0.04)]"
            />
          ))}
        </div>
      ) : stats.length === 0 ? (
        <EmptyState message="No oracle data available yet." />
      ) : (
        <OracleTable stats={stats} />
      )}
    </main>
  );
}
