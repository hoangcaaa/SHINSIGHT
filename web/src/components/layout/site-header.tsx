/// Site header — logo + nav + wallet connect
import { NavLinks } from "@/components/layout/nav-links";
import { ConnectButton } from "@/components/wallet/connect-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[#0C0B09] px-6">
      {/* Logo */}
      <span
        className="text-xl font-bold tracking-widest text-[#EF9F27]"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        SHINSIGHT
      </span>

      {/* Center nav */}
      <NavLinks />

      {/* Wallet */}
      <ConnectButton />
    </header>
  );
}
