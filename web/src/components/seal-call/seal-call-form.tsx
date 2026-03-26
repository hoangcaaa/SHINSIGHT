"use client";
/// Step 1: Seal a call — asset, direction, target price, reveal time, unlock price
import { ASSETS } from "@/lib/utils/asset-config";

export interface SealCallFormData {
  asset: number;
  direction: boolean; // true=UP, false=DOWN
  targetPriceUsd: string;
  revealAt: string; // datetime-local string
  unlockPriceApt: string;
}

interface SealCallFormProps {
  data: SealCallFormData;
  onChange: (data: SealCallFormData) => void;
  onNext: () => void;
}

/** Returns the minimum reveal time (now + 1 h) as a UTC datetime-local string */
const minRevealAt = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
};



export function SealCallForm({ data, onChange, onNext }: SealCallFormProps) {
  function set<K extends keyof SealCallFormData>(
    key: K,
    value: SealCallFormData[K],
  ) {
    onChange({ ...data, [key]: value });
  }

  const isValid =
    data.targetPriceUsd !== "" &&
    Number(data.targetPriceUsd) > 0 &&
    data.revealAt !== "" &&
    Number(data.unlockPriceApt) >= 0.1;

  return (
    <div className="flex flex-col gap-4">
      {/* Asset select */}
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-[#888780]">
          Asset
        </label>
        <select
          value={data.asset}
          onChange={(e) => set("asset", Number(e.target.value))}
          className="w-full rounded-md border border-[rgba(255,255,255,0.1)] bg-[#1E1D19] px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:ring-1 focus:ring-[#EF9F27]"
        >
          {ASSETS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.symbol} — {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Direction toggle */}
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-[#888780]">
          Direction
        </label>
        <div className="flex gap-2">
          {(["UP", "DOWN"] as const).map((dir) => {
            const isUp = dir === "UP";
            const active = data.direction === isUp;
            return (
              <button
                key={dir}
                type="button"
                onClick={() => set("direction", isUp)}
                className={`flex-1 rounded-md border py-2 text-sm font-semibold transition-colors ${
                  active
                    ? isUp
                      ? "border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]"
                      : "border-[#E24B4A] bg-[#E24B4A]/10 text-[#E24B4A]"
                    : "border-[rgba(255,255,255,0.1)] text-[#888780] hover:border-[rgba(255,255,255,0.2)]"
                }`}
              >
                {isUp ? "↑ UP" : "↓ DOWN"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target price */}
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-[#888780]">
          Target Price (USD)
        </label>
        <input
          type="number"
          min="0"
          step="any"
          value={data.targetPriceUsd}
          onChange={(e) => set("targetPriceUsd", e.target.value)}
          placeholder="e.g. 75000"
          className="w-full rounded-md border border-[rgba(255,255,255,0.1)] bg-[#1E1D19] px-3 py-2 text-sm text-[#F5F5F0] placeholder-[#888780] focus:outline-none focus:ring-1 focus:ring-[#EF9F27]"
        />
      </div>

      {/* Reveal at */}
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-[#888780]">
          Reveal Date/Time — UTC (min +1 h)
        </label>
        <input
          type="datetime-local"
          min={minRevealAt()}
          value={data.revealAt}
          onChange={(e) => set("revealAt", e.target.value)}
          className="w-full rounded-md border border-[rgba(255,255,255,0.1)] bg-[#1E1D19] px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:ring-1 focus:ring-[#EF9F27]"
        />
      </div>

      {/* Unlock price */}
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-[#888780]">
          Unlock Price (APT, min 0.1)
        </label>
        <input
          type="number"
          min="0.1"
          step="0.1"
          value={data.unlockPriceApt}
          onChange={(e) => set("unlockPriceApt", e.target.value)}
          placeholder="e.g. 1.0"
          className="w-full rounded-md border border-[rgba(255,255,255,0.1)] bg-[#1E1D19] px-3 py-2 text-sm text-[#F5F5F0] placeholder-[#888780] focus:outline-none focus:ring-1 focus:ring-[#EF9F27]"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!isValid}
        className="mt-2 rounded-md bg-[#EF9F27] px-4 py-2.5 text-sm font-semibold text-[#0C0B09] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Preview Call →
      </button>
    </div>
  );
}
