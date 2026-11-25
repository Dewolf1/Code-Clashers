"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { sounds } from "@/lib/sounds";

export default function WarHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await api.getWarHistory();
        setHistory(data || []);
      } catch (err) {
        console.error("Failed to load war history", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in py-6 px-4">
      {/* Header */}
      <div className="surface-panel p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">📜</span>
          <div>
            <h1 className="text-3xl font-display text-[var(--color-ink)]">
              Clan War History & Records
            </h1>
            <p className="text-xs font-mono text-[var(--color-muted)]">
              Archived battle chronicles, star conquests, and clan destruction statistics
            </p>
          </div>
        </div>
      </div>

      {/* History Log List */}
      {loading ? (
        <div className="surface-panel p-12 text-center text-sm font-mono text-[var(--color-muted)]">
          Loading war chronicles...
        </div>
      ) : history.length === 0 ? (
        <div className="surface-panel p-12 text-center text-sm font-mono text-[var(--color-muted)]">
          No archived wars found yet. Complete a battle day to log history!
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((war) => {
            const totalStars = war.clan_a_stars + war.clan_b_stars;
            return (
              <div
                key={war.war_id}
                className="surface-panel p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-[var(--color-rule-2)] transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold">
                      {war.status}
                    </span>
                    <span className="text-xs font-mono text-[var(--color-muted)]">
                      {new Date(war.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-xl font-display text-[var(--color-ink)] flex items-center gap-2 flex-wrap">
                    <span className="text-[var(--color-accent)]">{war.clan_a_name}</span>
                    <span className="text-xs font-mono text-[var(--color-muted)]">vs</span>
                    <span className="text-[var(--color-cool)]">{war.clan_b_name}</span>
                  </h3>

                  <div className="flex items-center gap-4 text-xs font-mono text-[var(--color-muted)] flex-wrap">
                    <span>⚔️ {war.slot_count || 5} Defense Bases</span>
                    <span>🎯 {war.attack_count || 0} Attacks Executed</span>
                    <span>👥 {war.attackers?.length || 0} Active Warriors</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="font-display text-2xl text-[var(--color-ink)] tabular-nums">
                      <span className="text-[var(--color-accent)] font-bold">{war.clan_a_stars}★</span>
                      <span className="text-xs text-[var(--color-muted)] mx-1">-</span>
                      <span className="text-[var(--color-cool)] font-bold">{war.clan_b_stars}★</span>
                    </div>
                    <div className="text-[11px] font-mono text-[var(--color-muted)]">
                      {totalStars} Total Stars Awarded
                    </div>
                  </div>

                  <Link
                    href={`/wars/${war.war_id}`}
                    onClick={() => sounds.playClick()}
                    className="btn-primary !min-h-[38px] !px-4 text-xs font-mono font-bold whitespace-nowrap"
                  >
                    View War Room →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

