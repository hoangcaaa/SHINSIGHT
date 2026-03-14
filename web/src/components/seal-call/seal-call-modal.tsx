"use client";
/// Seal a call modal — 3-step flow: form → preview → commit
import { useState } from "react";
import { SealCallForm, type SealCallFormData } from "@/components/seal-call/seal-call-form";
import { SealCallPreview } from "@/components/seal-call/seal-call-preview";
import { SealCallCommit } from "@/components/seal-call/seal-call-commit";

const STEPS = ["Details", "Preview", "Commit"] as const;

const defaultFormData: SealCallFormData = {
  asset: 0,
  direction: true,
  targetPriceUsd: "",
  revealAt: "",
  unlockPriceApt: "1.0",
};

interface SealCallModalProps {
  open: boolean;
  onClose: () => void;
}

export function SealCallModal({ open, onClose }: SealCallModalProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [formData, setFormData] = useState<SealCallFormData>(defaultFormData);

  function handleClose() {
    setStep(0);
    setFormData(defaultFormData);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#161511] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold tracking-wide text-[#F5F5F0]">
            Seal a Call
          </h2>
          <button
            onClick={handleClose}
            className="text-[#888780] transition-colors hover:text-[#F5F5F0]"
          >
            ✕
          </button>
        </div>

        {/* Step indicators */}
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  i < step
                    ? "bg-[#1D9E75] text-white"
                    : i === step
                      ? "bg-[#EF9F27] text-[#0C0B09]"
                      : "bg-[#1E1D19] text-[#888780]"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs ${i === step ? "text-[#F5F5F0]" : "text-[#888780]"}`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="h-px w-6 bg-[rgba(255,255,255,0.1)]" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && (
          <SealCallForm
            data={formData}
            onChange={setFormData}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <SealCallPreview
            data={formData}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <SealCallCommit
            data={formData}
            onBack={() => setStep(1)}
            onDone={handleClose}
          />
        )}
      </div>
    </div>
  );
}
