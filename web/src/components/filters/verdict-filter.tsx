"use client";
/// Pill button filter for verdict (ALL / TRUE / FALSE / EXPIRED) with color coding
interface VerdictFilterProps {
  selected: string | null;
  onSelect: (verdict: string | null) => void;
}

const VERDICTS = [
  { value: "TRUE", color: "#1D9E75" },
  { value: "FALSE", color: "#E24B4A" },
  { value: "EXPIRED", color: "#888780" },
] as const;

export function VerdictFilter({ selected, onSelect }: VerdictFilterProps) {
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
      {VERDICTS.map(({ value, color }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className="rounded-full px-3 py-1 text-xs font-semibold transition-all border"
          style={
            selected === value
              ? { backgroundColor: color, borderColor: color, color: "#fff" }
              : { borderColor: "rgba(255,255,255,0.12)", color: "#888780" }
          }
        >
          {value}
        </button>
      ))}
    </div>
  );
}
