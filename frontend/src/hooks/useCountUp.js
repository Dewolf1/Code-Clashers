"use client";

/**
 * useCountUp — Animated numeric count-up hook.
 * Uses requestAnimationFrame with easeOutQuad easing. No external libraries.
 *
 * @param {number} target - The number to count up to
 * @param {number} duration - Animation duration in ms (default: 900)
 * @param {boolean} enabled - Whether to run the animation (default: true)
 * @returns {number} - Current animated value
 */

import { useState, useEffect, useRef } from "react";

function easeOutQuad(t) {
  return t * (2 - t);
}

export function useCountUp(target, duration = 900, enabled = true) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setCount(target);
      return;
    }

    const startValue = prevTargetRef.current;
    prevTargetRef.current = target;

    if (startValue === target) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuad(progress);
      const current = Math.round(startValue + (target - startValue) * eased);
      setCount(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, enabled]);

  return count;
}

