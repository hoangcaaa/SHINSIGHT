"use client";
/// CSS 3D flip animation wrapper — front shows sealed card, back shows revealed card
import type { ReactNode } from "react";

interface CallCardFlipProps {
  isRevealed: boolean;
  front: ReactNode;
  back: ReactNode;
}

export function CallCardFlip({ isRevealed, front, back }: CallCardFlipProps) {
  return (
    <div className="card-flip relative h-full w-full">
      <div className={`card-inner relative h-full w-full${isRevealed ? " revealed" : ""}`}>
        {/* Front face — sealed */}
        <div className="card-face absolute inset-0 h-full w-full">
          {front}
        </div>
        {/* Back face — revealed */}
        <div className="card-face card-face-back absolute inset-0 h-full w-full">
          {back}
        </div>
      </div>
    </div>
  );
}
