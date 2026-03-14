/// Asset badge — colored dot + symbol for BTC/ETH/SOL/BNB/APT
import { getAsset } from "@/lib/utils/asset-config";

interface AssetBadgeProps {
  assetId: number;
}

export function AssetBadge({ assetId }: AssetBadgeProps) {
  const asset = getAsset(assetId);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1E1D19] px-2.5 py-1 text-xs font-semibold text-[#F5F5F0]">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: asset.color }}
      />
      {asset.symbol}
    </span>
  );
}
