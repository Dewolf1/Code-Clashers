"use client";

/**
 * ToastContext — Unified glassmorphic notification system.
 * Replaces scattered setSpellMessage / setTrapNotice / setError state across all components.
 * Supports types: success | error | spell | war_event | info
 */

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

let _externalDispatch = null;

/** Call toast.success(...) / toast.error(...) from anywhere — even outside React. */
export const toast = {
  success: (msg, duration) => _externalDispatch?.({ type: "success", msg, duration }),
  error: (msg, duration) => _externalDispatch?.({ type: "error", msg, duration }),
  spell: (msg, duration) => _externalDispatch?.({ type: "spell", msg, duration }),
  war_event: (msg, duration) => _externalDispatch?.({ type: "war_event", msg, duration }),
  info: (msg, duration) => _externalDispatch?.({ type: "info", msg, duration }),
};

const TOAST_DEFAULTS = {
  success: { icon: "✓", color: "oklch(75% 0.18 150)", bg: "oklch(75% 0.18 150 / 0.1)", border: "oklch(75% 0.18 150 / 0.4)", duration: 3500 },
  error:   { icon: "✕", color: "oklch(65% 0.22 25)", bg: "oklch(65% 0.22 25 / 0.1)", border: "oklch(65% 0.22 25 / 0.4)", duration: 4500 },
  spell:   { icon: "⚡", color: "var(--tier-gold)", bg: "oklch(88% 0.21 85 / 0.1)", border: "oklch(88% 0.21 85 / 0.4)", duration: 3500 },
  war_event: { icon: "⚔️", color: "var(--color-accent)", bg: "oklch(70% 0.19 48 / 0.1)", border: "oklch(70% 0.19 48 / 0.4)", duration: 4000 },
  info:    { icon: "ℹ", color: "oklch(70% 0.15 240)", bg: "oklch(70% 0.15 240 / 0.1)", border: "oklch(70% 0.15 240 / 0.4)", duration: 3000 },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dispatch = useCallback(({ type, msg, duration }) => {
    const id = ++idRef.current;
    const cfg = TOAST_DEFAULTS[type] || TOAST_DEFAULTS.info;
    const ms = duration ?? cfg.duration;
    setToasts(prev => [...prev.slice(-4), { id, type, msg, ...cfg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ms);
  }, []);

  _externalDispatch = dispatch;

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ dispatch, dismiss }}>
      {children}
      {/* Toaster HUD — fixed bottom-right */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="alert"
            className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl backdrop-blur-md shadow-2xl max-w-xs text-sm font-mono animate-fade-in"
            style={{
              background: t.bg,
              border: `1px solid ${t.border}`,
              color: "var(--color-ink)",
            }}
          >
            <span style={{ color: t.color }} className="text-base mt-0.5 shrink-0">{t.icon}</span>
            <span className="flex-1 leading-snug">{t.msg}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors leading-none"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

