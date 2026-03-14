"use client";
/// Countdown timer — live countdown to reveal timestamp
import { useEffect, useState } from "react";

interface CountdownTimerProps {
  revealTimestamp: string;
}

function computeTimeLeft(revealTimestamp: string) {
  const target = new Date(revealTimestamp).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return null;

  const totalSecs = Math.floor(diff / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return { d, h, m, s };
}

export function CountdownTimer({ revealTimestamp }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() =>
    computeTimeLeft(revealTimestamp),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(computeTimeLeft(revealTimestamp));
    }, 1000);
    return () => clearInterval(interval);
  }, [revealTimestamp]);

  if (!timeLeft) {
    return (
      <span className="animate-pulse text-xs font-bold tracking-widest text-[#EF9F27]">
        REVEALING...
      </span>
    );
  }

  const { d, h, m, s } = timeLeft;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);

  return (
    <span className="font-mono text-xs text-[#888780]">{parts.join(" ")}</span>
  );
}
