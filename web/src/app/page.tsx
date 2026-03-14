"use client";
/// Live Feed page — real-time sealed calls grid + seal modal
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useCalls } from "@/lib/hooks/use-calls";
import { CallCardGrid } from "@/components/calls/call-card-grid";
import { SealCallModal } from "@/components/seal-call/seal-call-modal";

export default function LiveFeedPage() {
  const { calls, loading } = useCalls();
  const [modalOpen, setModalOpen] = useState(false);

  // Show only active (unsealed) calls on live feed
  const activeCalls = calls.filter((c) => c.status === "active");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F0]">Live Feed</h1>
          <p className="mt-1 text-sm text-[#888780]">
            Active sealed calls — unlock to see the target price
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-[#EF9F27] px-5 py-2.5 text-sm font-semibold text-[#0C0B09] transition-opacity hover:opacity-90"
        >
          + Seal a Call
        </button>
      </div>

      {/* Calls grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#EF9F27] border-t-transparent" />
        </div>
      ) : (
        <CallCardGrid calls={activeCalls} />
      )}

      {/* Seal modal */}
      <SealCallModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
