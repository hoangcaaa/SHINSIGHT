"use client";
/// Hook: wallet actions — deposit for call, commit call
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AccountAddress } from "@aptos-labs/ts-sdk";
import { MODULE_ADDRESS } from "@/lib/aptos-client";

export function useWalletActions() {
  const { signAndSubmitTransaction, account } = useWallet();

  /** Deposit unlock_price APT into escrow for a call */
  async function depositForCall(callIdOnchain: number): Promise<string> {
    const response = await signAndSubmitTransaction({
      data: {
        function: `${MODULE_ADDRESS}::escrow::deposit`,
        functionArguments: [
          AccountAddress.from(MODULE_ADDRESS),
          callIdOnchain.toString(),
        ],
      },
    });
    return response.hash;
  }

  /** Submit create_call on-chain after sealing via Edge Function */
  async function commitCall(params: {
    contentHash: string;
    asset: number;
    direction: boolean;
    targetPrice: number;
    revealTimestamp: number;
    unlockPrice: number;
  }): Promise<string> {
    const contentHashBytes = hexToUint8Array(params.contentHash);
    const response = await signAndSubmitTransaction({
      data: {
        function: `${MODULE_ADDRESS}::call_registry::create_call`,
        functionArguments: [
          AccountAddress.from(MODULE_ADDRESS),
          contentHashBytes,
          params.asset,
          params.direction,
          params.targetPrice.toString(),
          params.revealTimestamp.toString(),
          params.unlockPrice.toString(),
        ],
      },
    });
    return response.hash;
  }

  return { depositForCall, commitCall, account };
}

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
