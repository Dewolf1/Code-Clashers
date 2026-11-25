"use client";

/**
 * WarChatHUD — Live bidirectional clan war chat.
 * Connects via WebSocket to /api/wars/{warId}/ws
 * Color-coded by clan side, auto-reconnects with exponential backoff.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { sounds } from "@/lib/sounds";

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api")
  .replace(/^http/, "ws");

export default function WarChatHUD({ warId, clanId, clanAId, clanAName, clanBName, currentHandle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const retryTimer = useRef(null);
  const bottomRef = useRef(null);

  const connect = useCallback(() => {
    if (!warId) return;
    const ws = new WebSocket(`${WS_BASE}/wars/${warId}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retryRef.current = 0;
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "chat") {
          setMessages(prev => [...prev.slice(-99), msg]);
          if (msg.sender !== currentHandle) sounds.playStar?.(1);
        }
      } catch { /* non-JSON frame */ }
    };

    ws.onclose = () => {
      setConnected(false);
      const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
      retryRef.current++;
      retryTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, [warId, currentHandle]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = () => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const msg = {
      type: "chat",
      sender: currentHandle || "Warrior",
      clan_id: clanId,
      text,
      ts: Date.now(),
    };
    wsRef.current.send(JSON.stringify(msg));
    setMessages(prev => [...prev.slice(-99), msg]);
    setInput("");
    sounds.playClick?.();
  };

  const isAlpha = (msg) => msg.clan_id === clanAId;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold border transition-all backdrop-blur-md shadow-lg"
        style={{
          background: "oklch(20% 0.03 240 / 0.85)",
          borderColor: connected ? "oklch(75% 0.18 150 / 0.5)" : "oklch(65% 0.22 25 / 0.5)",
          color: "var(--color-ink)",
        }}
      >
        <span style={{ color: connected ? "oklch(75% 0.18 150)" : "oklch(65% 0.22 25)" }}>
          {connected ? "●" : "○"}
        </span>
        ⚔ War Chat
        {messages.length > 0 && !open && (
          <span className="bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-full text-[10px] px-1.5 min-w-[18px] text-center leading-5">
            {messages.length > 9 ? "9+" : messages.length}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          className="w-72 sm:w-80 rounded-xl backdrop-blur-xl border shadow-2xl flex flex-col overflow-hidden animate-fade-in"
          style={{
            background: "oklch(16% 0.025 240 / 0.92)",
            borderColor: "oklch(30% 0.05 240 / 0.6)",
            height: "320px",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[oklch(30%_0.05_240_/_0.5)] shrink-0">
            <span className="font-mono text-[10px] font-bold uppercase text-[var(--color-muted)] tracking-widest">
              {clanAName} vs {clanBName}
            </span>
            <button onClick={() => setOpen(false)} className="text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors text-lg leading-none">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
            {messages.length === 0 && (
              <p className="text-center text-[var(--color-muted)] text-xs mt-8 font-mono">No messages yet. Coordinate your clan!</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.sender === currentHandle ? "items-end" : "items-start"}`}>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-[10px] font-mono font-bold"
                    style={{ color: isAlpha(m) ? "oklch(70% 0.19 48)" : "oklch(65% 0.22 25)" }}
                  >
                    {m.sender}
                  </span>
                  <span className="text-[9px] text-[var(--color-muted)] font-mono">
                    {m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
                <div
                  className="max-w-[90%] rounded-lg px-3 py-1.5 text-xs font-mono leading-relaxed"
                  style={{
                    background: m.sender === currentHandle ? "oklch(25% 0.04 240 / 0.8)" : "oklch(22% 0.03 240 / 0.7)",
                    color: "var(--color-ink)",
                    border: "1px solid oklch(30% 0.04 240 / 0.4)",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 px-3 py-2 border-t border-[oklch(30%_0.05_240_/_0.5)] shrink-0">
            <input
              className="flex-1 bg-[oklch(20%_0.03_240_/_0.8)] border border-[oklch(30%_0.05_240_/_0.5)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]/50 transition-colors"
              placeholder="Tactical comms..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              maxLength={200}
              disabled={!connected}
            />
            <button
              onClick={send}
              disabled={!input.trim() || !connected}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-40"
              style={{
                background: "var(--color-accent)",
                color: "var(--color-accent-ink)",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

