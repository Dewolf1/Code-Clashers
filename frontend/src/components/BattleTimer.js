"use client";

import React, { useEffect, useState } from "react";

/**
 * BattleTimer Component
 * Esports digital HUD countdown clock styled with Saira Condensed 800.
 * Includes tactical bevel bezel, dynamic urgency aura, and critical hazard alert.
 */
export default function BattleTimer({ targetTime, label = "Time Remaining" }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false, isCritical: false });

  useEffect(() => {
    if (!targetTime) return;

    function calculate() {
      const target = new Date(targetTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);

      if (diff === 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true, isCritical: false });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const isCritical = diff < 5 * 60 * 1000; // < 5 mins

      setTimeLeft({ hours, minutes, seconds, isExpired: false, isCritical });
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-lg transition-all ${
      timeLeft.isCritical
        ? "bg-[var(--color-bad-soft)] border border-[var(--color-bad)] animate-hud-danger"
        : "bg-[var(--color-paper-2)]/80 border border-[var(--color-rule-2)]"
    }`}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`w-1.5 h-1.5 rounded-full ${
          timeLeft.isCritical
            ? "bg-[var(--color-bad)] animate-ping"
            : timeLeft.isExpired
            ? "bg-[var(--color-muted)]"
            : "bg-[var(--color-accent)] animate-pulse"
        }`} />
        <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--color-muted)] font-bold">
          {label}
        </span>
      </div>
      <div
        className={`font-display text-3xl sm:text-4xl tabular-nums font-extrabold tracking-tight ${
          timeLeft.isCritical
            ? "text-[var(--color-bad)] drop-shadow-[0_0_12px_var(--color-bad)]"
            : timeLeft.isExpired
            ? "text-[var(--color-muted)]"
            : "text-[var(--color-accent)] drop-shadow-[0_0_10px_var(--color-accent-wash)]"
        }`}
      >
        {timeLeft.isExpired
          ? "00:00:00"
          : `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`}
      </div>
    </div>
  );
}

