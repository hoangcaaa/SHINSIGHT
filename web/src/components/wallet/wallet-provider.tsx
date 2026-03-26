"use client";
/// Aptos wallet adapter provider — auto-detects AIP-62 wallets (Petra, etc.)
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { type ReactNode } from "react";

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={false}
      onError={(error) => {
        console.error("[WalletProvider] error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
