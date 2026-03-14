"use client";
/// Hook: read on-chain escrow state for a call
import { useEffect, useState } from "react";
import { aptos, MODULE_ADDRESS } from "@/lib/aptos-client";
import type { EscrowState } from "@/lib/types";

export function useCallEscrow(callIdOnchain: number | null) {
  const [escrow, setEscrow] = useState<EscrowState>({
    buyerCount: 0,
    totalDeposited: 0,
    isSettled: false,
  });

  useEffect(() => {
    if (callIdOnchain === null || !MODULE_ADDRESS) return;

    async function fetchEscrow() {
      try {
        const result = await aptos.view({
          payload: {
            function: `${MODULE_ADDRESS}::escrow::get_pool_info`,
            functionArguments: [MODULE_ADDRESS, callIdOnchain!.toString()],
          },
        });
        if (result && result.length >= 3) {
          setEscrow({
            totalDeposited: Number(result[0]),
            buyerCount: Number(result[1]),
            isSettled: Boolean(result[2]),
          });
        }
      } catch {
        // Pool may not exist yet (0 buyers)
      }
    }

    fetchEscrow();
    // Poll every 15s for on-chain updates
    const interval = setInterval(fetchEscrow, 15000);
    return () => clearInterval(interval);
  }, [callIdOnchain]);

  return escrow;
}
