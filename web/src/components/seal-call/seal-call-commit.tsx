"use client";
/// Step 3: Commit sealed call — calls edge fn + chain tx
import { useState } from "react";
import type { SealCallFormData } from "@/components/seal-call/seal-call-form";
import { useWalletActions } from "@/lib/hooks/use-wallet-actions";

interface SealCallCommitProps {
  data: SealCallFormData;
  onBack: () => void;
  onDone: () => void;
}

type CommitState = "idle" | "sealing" | "submitting" | "done" | "error";

export function SealCallCommit({ data, onBack, onDone }: SealCallCommitProps) {
  const { commitCall, account } = useWalletActions();
  const [state, setState] = useState<CommitState>("idle");
  const [callId, setCallId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function handleCommit() {
    setState("sealing");
    try {
      // Treat the datetime-local value as UTC by appending "Z"
      const revealUnix = Math.floor(new Date(data.revealAt + "Z").getTime() / 1000);

      // Step 1: seal via Edge Function → get content_hash
      const res = await fetch("/api/submit-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Wallet-Address": account?.address?.toString() ?? "",
        },
        body: JSON.stringify({
          asset: data.asset,
          direction: data.direction,
          target_price: Math.round(Number(data.targetPriceUsd) * 1e8),
          reveal_timestamp: revealUnix,
          unlock_price: Math.round(Number(data.unlockPriceApt) * 1e8),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Seal failed");
      }

      const { content_hash, call_id: callDbId } = await res.json();
      setState("submitting");

      // Step 2: commit on-chain
      const txHash = await commitCall({
        contentHash: content_hash,
        asset: data.asset,
        direction: data.direction,
        targetPrice: Math.round(Number(data.targetPriceUsd) * 1e8),
        revealTimestamp: revealUnix,
        unlockPrice: Math.round(Number(data.unlockPriceApt) * 1e8),
      });

      // Step 3: link on-chain call ID back to Supabase record
      // The on-chain call_id is emitted in the tx events — extract from indexer
      // For MVP, use the DB ID as display; call_id_onchain updated via event listener
      await fetch("/api/link-call-onchain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_db_id: callDbId, tx_hash: txHash }),
      }).catch(() => {}); // best-effort linking

      setCallId(callDbId?.toString() ?? txHash.slice(0, 10));
      setState("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(msg);
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <span className="text-4xl">✓</span>
        <p className="font-semibold text-[#1D9E75]">Call sealed on-chain!</p>
        <p className="text-xs text-[#888780]">Call ID: {callId}</p>
        <button
          onClick={onDone}
          className="mt-2 rounded-md bg-[#EF9F27] px-6 py-2 text-sm font-semibold text-[#0C0B09] hover:opacity-90"
        >
          Done
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-[#E24B4A] bg-[#E24B4A]/10 px-4 py-3 text-sm text-[#E24B4A]">
          {errorMsg}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="flex-1 rounded-md border border-[rgba(255,255,255,0.1)] py-2 text-sm text-[#888780]"
          >
            ← Back
          </button>
          <button
            onClick={() => setState("idle")}
            className="flex-1 rounded-md bg-[#EF9F27] py-2 text-sm font-semibold text-[#0C0B09]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isLoading = state === "sealing" || state === "submitting";
  const loadingLabel =
    state === "sealing" ? "Sealing call..." : "Submitting to chain...";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[#888780]">
        This will encrypt your call and publish it on Aptos. You cannot edit it
        after committing.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 rounded-md border border-[rgba(255,255,255,0.1)] py-2 text-sm text-[#888780] disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          onClick={handleCommit}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#EF9F27] py-2 text-sm font-semibold text-[#0C0B09] hover:opacity-90 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0C0B09] border-t-transparent" />
              {loadingLabel}
            </>
          ) : (
            "Confirm & Seal"
          )}
        </button>
      </div>
    </div>
  );
}
