"use client";

import React from "react";

/**
 * StarRating Component
 * Renders 3 competitive stars following Hallmark craft standards.
 * Star 1 = Radiant Ember, Star 2 = Solar Flare, Star 3 = Pure Champion Gold.
 * Supports optional slam animation with staggered delays for celebratory reveals.
 */
export default function StarRating({ stars = 0, size = 20, animate = false, className = "" }) {
  const starColors = [
    "var(--color-star-1)",
    "var(--color-star-2)",
    "var(--tier-gold)",
  ];

  const glowShadows = [
    "drop-shadow(0 0 4px oklch(74% 0.22 45 / 0.5))",
    "drop-shadow(0 0 6px oklch(85% 0.19 55 / 0.6))",
    "drop-shadow(0 0 10px oklch(88% 0.21 85 / 0.85))",
  ];

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={`${stars} out of 3 stars`}
    >
      {[0, 1, 2].map((idx) => {
        const isFilled = idx < stars;
        const fillColor = isFilled ? starColors[idx] : "transparent";
        const strokeColor = isFilled ? starColors[idx] : "var(--color-rule-2)";
        const animClass = animate && isFilled ? "animate-star-slam" : "transition-all duration-200";
        const animDelay = animate && isFilled ? `${idx * 160}ms` : undefined;
        const filterGlow = isFilled ? glowShadows[idx] : "none";

        return (
          <div
            key={idx}
            className={animClass}
            style={{ animationDelay: animDelay, display: "inline-flex" }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: filterGlow }}
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

