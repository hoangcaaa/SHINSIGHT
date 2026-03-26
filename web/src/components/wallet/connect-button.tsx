"use client";
/// Wallet connect/disconnect button — shows address when connected, warns on wrong network
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { truncateAddress } from "@/lib/utils/format-price";

const EXPECTED_NETWORK = process.env.NEXT_PUBLIC_APTOS_NETWORK ?? "testnet";

export function ConnectButton() {
  const { connect, disconnect, account, connected, wallets, network } = useWallet();

  const isWrongNetwork =
    connected && network?.name && network.name.toLowerCase() !== EXPECTED_NETWORK;

  if (connected && account?.address) {
    return (
      <div className="flex items-center gap-2">
        {isWrongNetwork && (
          <span className="rounded-md bg-[#E24B4A]/10 px-2 py-1 text-xs text-[#E24B4A]">
            Wrong network — switch to {EXPECTED_NETWORK}
          </span>
        )}
        <span className="rounded-md bg-[#1E1D19] px-3 py-1.5 text-sm text-[#F5F5F0]">
          {truncateAddress(account.address.toString())}
        </span>
        <button
          onClick={() => disconnect()}
          className="rounded-md border border-[rgba(255,255,255,0.1)] px-3 py-1.5 text-sm text-[#888780] transition-colors hover:border-[#EF9F27] hover:text-[#EF9F27]"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const availableWallet = wallets?.find((w) => w.name === "Petra") ?? wallets?.[0];

  return (
    <button
      onClick={() => availableWallet && connect(availableWallet.name)}
      disabled={!availableWallet}
      className="rounded-md bg-[#EF9F27] px-4 py-1.5 text-sm font-semibold text-[#0C0B09] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {availableWallet ? "Connect Wallet" : "Install Wallet"}
    </button>
  );
}
