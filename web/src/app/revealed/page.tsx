"use client";
/// Revealed calls page — filterable grid of settled/expired call cards
import { useState } from "react";
import { useRevealedCalls } from "@/lib/hooks/use-revealed-calls";
import { CallCardRevealed } from "@/components/calls/call-card-revealed";
import { AssetFilter } from "@/components/filters/asset-filter";
import { VerdictFilter } from "@/components/filters/verdict-filter";
import { SkeletonCard } from "@/components/shared/skeleton-card";
import { EmptyState } from "@/components/shared/empty-state";

export default function RevealedPage() {
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);
  const [selectedVerdict, setSelectedVerdict] = useState<string | null>(null);

  const { calls, loading } = useRevealedCalls({
    asset: selectedAsset,
    verdict: selectedVerdict,
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[#F5F5F0]">Revealed Calls</h1>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <AssetFilter selected={selectedAsset} onSelect={setSelectedAsset} />
        <div className="h-4 w-px bg-[rgba(255,255,255,0.12)]" />
        <VerdictFilter selected={selectedVerdict} onSelect={setSelectedVerdict} />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : calls.length === 0 ? (
        <EmptyState message="No revealed calls found for the selected filters." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {calls.map((call) => (
            <CallCardRevealed key={call.id} call={call} />
          ))}
        </div>
      )}
    </main>
  );
}
