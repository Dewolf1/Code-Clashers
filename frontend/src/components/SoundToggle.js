"use client";

import React, { useState, useEffect } from "react";
import { sounds } from "@/lib/sounds";

export default function SoundToggle() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(sounds.getMuted());
  }, []);

  const handleToggle = () => {
    const isNowMuted = sounds.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      sounds.playClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="p-2 rounded-md bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-rule-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
      title={muted ? "Unmute sound effects" : "Mute sound effects"}
      aria-label={muted ? "Audio muted, click to unmute" : "Audio active, click to mute"}
    >
      {muted ? (
        // Muted Speaker SVG
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--color-muted)]"
          aria-hidden="true"
        >
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        // Active Sound Waves SVG
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--color-accent)]"
          aria-hidden="true"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}

