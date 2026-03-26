"use client";
/// Step 2: Preview the sealed call — mock card with visible target price
import type { SealCallFormData } from "@/components/seal-call/seal-call-form";
import { AssetBadge } from "@/components/calls/asset-badge";
import { getAsset } from "@/lib/utils/asset-config";

interface SealCallPreviewProps {
  data: SealCallFormData;
  onBack: () => void;
  onNext: () => void;
}

export function SealCallPreview({ data, onBack, onNext }: SealCallPreviewProps) {
  const asset = getAsset(data.asset);
  const directionUp = data.direction;
  const revealLabel = data.revealAt
    ? new Date(data.revealAt + "Z").toLocaleString("en-US", { timeZone: "UTC" }) + " UTC"
    : "—";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-[#888780]">
        Review your call before committing to chain.
      </p>

      {/* Mock sealed card */}
      <div className="rounded-xl border border-[#EF9F27]/40 bg-[#161511] p-4">
        <div className="mb-3 flex items-center justify-between">
          <AssetBadge assetId={data.asset} />
          <span className={`text-xl font-bold ${directionUp ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}>
            {directionUp ? "↑" : "↓"}
          </span>
        </div>

        {/* Target price — visible only to creator */}
        <div className="mb-3 rounded-lg border border-[#EF9F27]/30 bg-[#EF9F27]/5 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-[#EF9F27]">
            Target Price [SEALED — only you see this]
          </p>
          <p className="mt-0.5 text-lg font-bold text-[#F5F5F0]">
            ${Number(data.targetPriceUsd).toLocaleString("en-US")}
          </p>
          <p className="text-xs text-[#888780]">{asset.name}</p>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#888780]">Reveal</p>
            <p className="text-xs text-[#F5F5F0]">{revealLabel}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#888780]">Unlock</p>
            <p className="text-xs text-[#EF9F27]">{data.unlockPriceApt} APT</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 rounded-md border border-[rgba(255,255,255,0.1)] py-2 text-sm text-[#888780] hover:border-[rgba(255,255,255,0.2)]"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 rounded-md bg-[#EF9F27] py-2 text-sm font-semibold text-[#0C0B09] hover:opacity-90"
        >
          Commit to Chain →
        </button>
      </div>
    </div>
  );
}
