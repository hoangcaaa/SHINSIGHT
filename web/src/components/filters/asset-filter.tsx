"use client";
/// Pill button filter for selecting asset (ALL / BTC / ETH / SOL / BNB / APT)
import { ASSETS } from "@/lib/utils/asset-config";

interface AssetFilterProps {
  selected: number | null;
  onSelect: (asset: number | null) => void;
}

export function AssetFilter({ selected, onSelect }: AssetFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
          selected === null
            ? "bg-[#EF9F27] text-[#0C0B09]"
            : "border border-[rgba(255,255,255,0.12)] text-[#888780] hover:border-[#EF9F27] hover:text-[#EF9F27]"
        }`}
      >
        ALL
      </button>
      {ASSETS.map((asset) => (
        <button
          key={asset.id}
          onClick={() => onSelect(asset.id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
            selected === asset.id
              ? "text-[#0C0B09]"
              : "border border-[rgba(255,255,255,0.12)] text-[#888780] hover:text-white"
          }`}
          style={
            selected === asset.id
              ? { backgroundColor: asset.color }
              : { borderColor: "rgba(255,255,255,0.12)" }
          }
        >
          {asset.symbol}
        </button>
      ))}
    </div>
  );
}
