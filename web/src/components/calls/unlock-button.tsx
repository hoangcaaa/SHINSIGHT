"use client";
/// Unlock button — multi-state: default → confirming → decrypting → revealed / error
import { useState } from "react";
import { useWalletActions } from "@/lib/hooks/use-wallet-actions";
import { decryptCall } from "@/lib/utils/decrypt-call";
import { formatApt, formatUsdPrice } from "@/lib/utils/format-price";
import type { Call } from "@/lib/types";

interface UnlockButtonProps {
  call: Call;
}

type State = "idle" | "confirming" | "decrypting" | "revealed" | "error";

export function UnlockButton({ call }: UnlockButtonProps) {
  const { depositForCall } = useWalletActions();
  const [state, setState] = useState<State>("idle");
  const [revealedPrice, setRevealedPrice] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const unlockApt = formatApt(call.unlock_price);

  async function handleUnlock() {
    if (!call.call_id_onchain) return;
    setState("confirming");
    try {
      const txHash = await depositForCall(call.call_id_onchain);
      setState("decrypting");

      // Call unlock-key Edge Function
      const res = await fetch("/api/unlock-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id: call.id, tx_hash: txHash }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Key delivery failed");
      }

      const { encrypted_blob, key, iv } = await res.json();
      const decrypted = await decryptCall(encrypted_blob, key, iv);
      setRevealedPrice(decrypted.target_price);
      setState("revealed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(msg);
      setState("error");
    }
  }

  if (state === "revealed" && revealedPrice !== null) {
    return (
      <div className="rounded-md border border-[#1D9E75] bg-[#1D9E75]/10 px-4 py-2 text-center text-sm text-[#1D9E75]">
        Target: {formatUsdPrice(revealedPrice)}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-md border border-[#E24B4A] bg-[#E24B4A]/10 px-4 py-2 text-center text-xs text-[#E24B4A]">
        {errorMsg}
      </div>
    );
  }

  const isLoading = state === "confirming" || state === "decrypting";

  return (
    <button
      onClick={handleUnlock}
      disabled={isLoading || !call.call_id_onchain}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-[#EF9F27] px-4 py-2 text-sm font-semibold text-[#EF9F27] transition-colors hover:bg-[#EF9F27]/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#EF9F27] border-t-transparent" />
          {state === "confirming" ? "Confirming..." : "Decrypting..."}
        </>
      ) : (
        `Unlock — ${unlockApt} APT`
      )}
    </button>
  );
}
