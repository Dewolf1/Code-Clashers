"use client";

import React, { useState, useEffect, useRef } from "react";
import { sounds } from "@/lib/sounds";

const REPLAY_STEPS = [
  { pct: 33.3, stars: 1, label: "Test Case #1 Cleared → 1st Star! ⭐" },
  { pct: 66.7, stars: 2, label: "Test Case #2 Cleared → 2nd Star! ⭐⭐" },
  { pct: 100.0, stars: 3, label: "Optimal Runtime Bound Verified → 3rd Star! ⭐⭐⭐" },
];

export default function BattleReplayModal({ attack, onClose }) {
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef(null);

  const currentStep = step >= 0 ? REPLAY_STEPS[step] : null;
  const destructionPct = currentStep ? currentStep.pct : 0;

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setStep((s) => {
          const next = s + 1;
          if (next >= REPLAY_STEPS.length) {
            setPlaying(false);
            sounds.playFanfare();
            return REPLAY_STEPS.length - 1;
          }
          sounds.playStar(next + 1);
          return next;
        });
      }, 1500 / speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed]);

  if (!attack) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="surface-elevated max-w-lg w-full p-6 sm:p-8 space-y-6 border border-[var(--color-rule-2)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">🎬</span>
            <div>
              <span className="text-xs uppercase font-mono text-[var(--color-accent)] font-bold">
                Combat Replay Theater
              </span>
              <h3 className="text-2xl font-display text-[var(--color-ink)]">
                Attack on Slot #{attack.target_position || attack.slot_position || 1}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="text-[var(--color-muted)] hover:text-[var(--color-ink)] font-mono text-xl p-1"
          >
            ✕
          </button>
        </div>

        {/* Attack Meta Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-lg bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-xs font-mono">
          <div>
            <span className="text-[var(--color-muted)] block text-[10px] uppercase">Attacker</span>
            <strong className="text-[var(--color-ink)] truncate block">@{attack.attacker_uid || "warrior"}</strong>
          </div>
          <div>
            <span className="text-[var(--color-muted)] block text-[10px] uppercase">Clan</span>
            <strong className="text-[var(--color-accent)] truncate block">{attack.attacker_clan_id || "ByteKnights"}</strong>
          </div>
          <div>
            <span className="text-[var(--color-muted)] block text-[10px] uppercase">Runtime</span>
            <strong className="text-[var(--color-ink)] block">{attack.time_taken_ms || 420}ms</strong>
          </div>
          <div>
            <span className="text-[var(--color-muted)] block text-[10px] uppercase">Target Stars</span>
            <strong className="text-[var(--color-accent)] block">{attack.stars_earned || 3} ★</strong>
          </div>
        </div>

        {/* Destruction Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[var(--color-muted)]">Base Destruction Progress</span>
            <span className="text-[var(--color-accent)] font-bold tabular-nums">
              {destructionPct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-[var(--color-paper-3)] h-4 rounded-full overflow-hidden border border-[var(--color-rule)]">
            <div
              className="bg-[var(--color-accent)] h-full transition-all duration-700 ease-out rounded-full"
              style={{ width: `${destructionPct}%` }}
            />
          </div>
        </div>

        {/* Current Replay Status Banner */}
        <div className="p-4 rounded-lg bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] text-center min-h-[64px] flex flex-col justify-center items-center">
          <p className="text-sm font-mono font-bold text-[var(--color-ink)]">
            {currentStep ? currentStep.label : "Press ▶ Play to initiate battle playback"}
          </p>
          <div className="flex items-center gap-2 mt-2 text-2xl">
            {[1, 2, 3].map((starIdx) => (
              <span
                key={starIdx}
                className={`transition-all duration-300 ${
                  currentStep && currentStep.stars >= starIdx
                    ? "opacity-100 scale-125"
                    : "opacity-20 scale-95"
                }`}
              >
                ⭐
              </span>
            ))}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setStep(-1);
              setPlaying(false);
            }}
            className="btn-secondary !min-h-[36px] !px-3 text-xs font-mono"
          >
            ↺ Reset
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setPlaying((p) => !p);
            }}
            className="btn-primary !min-h-[36px] !px-5 text-xs font-mono font-bold"
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setStep((s) => {
                const next = Math.min(s + 1, REPLAY_STEPS.length - 1);
                sounds.playStar(next + 1);
                return next;
              });
            }}
            className="btn-secondary !min-h-[36px] !px-3 text-xs font-mono"
          >
            ⏭ Step Next
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setSpeed((s) => (s === 1 ? 2 : 1));
            }}
            className="btn-secondary !min-h-[36px] !px-3 text-xs font-mono font-bold"
          >
            {speed}x Speed
          </button>
        </div>
      </div>
    </div>
  );
}

