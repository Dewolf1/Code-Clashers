"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import StarRating from "./StarRating";
import { sounds } from "@/lib/sounds";

export default function AttackCelebrationModal({
  isOpen,
  stars = 0,
  destruction = 100,
  timeMs = 45,
  warId = null,
  onClose,
}) {
  const [animatedStars, setAnimatedStars] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setAnimatedStars(0);
      return;
    }

    // Play victory fanfare
    sounds.playFanfare();

    // Sequentially animate stars
    let current = 0;
    const interval = setInterval(() => {
      if (current < stars) {
        current += 1;
        setAnimatedStars(current);
        sounds.playStar(current);
      } else {
        clearInterval(interval);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [isOpen, stars]);

  if (!isOpen) return null;

  const isThreeStar = stars === 3;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className={`surface-elevated max-w-md w-full p-8 text-center space-y-6 relative overflow-hidden rounded-xl ${
        isThreeStar
          ? "border-2 border-[var(--tier-gold)] shadow-[0_0_60px_oklch(88%_0.21_85_/_0.35)]"
          : "border-2 border-[var(--color-accent)] shadow-[0_0_40px_rgba(255,122,0,0.25)]"
      }`}>
        {/* Decorative Top Flare */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 ${
          isThreeStar ? "bg-[var(--tier-gold)] shadow-[0_0_20px_var(--tier-gold)]" : "bg-[var(--color-accent)]"
        }`} />

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase font-bold bg-[var(--color-paper-2)] border border-[var(--color-rule-2)]">
            <span className={isThreeStar ? "text-[var(--tier-gold)]" : "text-[var(--color-accent)]"}>
              {isThreeStar ? "🏆 PERFECT 3-STAR DECIMATION" : stars > 0 ? "⚔️ TACTICAL VICTORY" : "ATTACK CONCLUDED"}
            </span>
          </div>
          <h2 className="text-4xl font-display text-[var(--color-ink)] uppercase tracking-tight">
            {isThreeStar ? "BASE DECIMATED!" : stars > 0 ? "VICTORY DECLARED" : "ATTACK REPORT"}
          </h2>
        </div>

        {/* Animated Stars with Slam Animation */}
        <div className="py-2 flex justify-center">
          <StarRating stars={animatedStars} size={52} animate={true} />
        </div>

        {/* Score & Telemetry Grid with Tactical Meters */}
        <div className="grid grid-cols-2 gap-4 text-center font-mono">
          <div className="bg-[var(--color-paper-2)] p-3 rounded-lg border border-[var(--color-rule)] space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider block">Destruction</span>
            <p className="text-2xl font-display text-[var(--color-ink)] tabular-nums">
              {destruction}%
            </p>
            <div className="w-full bg-[var(--color-paper-3)] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isThreeStar ? "bg-[var(--tier-gold)]" : "bg-[var(--color-accent)]"
                }`}
                style={{ width: `${destruction}%` }}
              />
            </div>
          </div>
          <div className="bg-[var(--color-paper-2)] p-3 rounded-lg border border-[var(--color-rule)] space-y-1">
            <span className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider block">Execution Time</span>
            <p className="text-2xl font-display text-[var(--color-accent)] tabular-nums">
              {timeMs} ms
            </p>
            <div className="text-[10px] text-[var(--color-ok)] font-bold">
              ⚡ Optimal Speed
            </div>
          </div>
        </div>

        <p className="text-sm text-[var(--color-ink-2)] font-body leading-relaxed">
          {stars > 0
            ? `Outstanding performance! Your assault added +${stars} stars to Clan Alpha's frontline chronicle.`
            : "No stars claimed this round. Refine your algorithmic approach and attack again!"}
        </p>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {warId ? (
            <Link
              href={`/wars/${warId}`}
              onClick={() => sounds.playClick()}
              className="btn-primary w-full sm:w-auto !px-6"
            >
              Return to War Map
            </Link>
          ) : (
            <Link
              href="/problems"
              onClick={() => sounds.playClick()}
              className="btn-primary w-full sm:w-auto !px-6"
            >
              Next Challenge
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="btn-secondary w-full sm:w-auto !px-4 text-sm"
          >
            Review Code
          </button>
        </div>
      </div>
    </div>
  );
}

