"use client";

import React from "react";
import { useCountUp } from "@/hooks/useCountUp";

/**
 * LeaderboardTable Component
 * Implements Hallmark Sport theme results-sheet design.
 * Full width, tabular numbers for ELO, strong rank numbering.
 */
/**
 * LeaderboardTable Component
 * Implements Hallmark Sport theme results-sheet design with Top 3 Gamified Podiums.
 * Full width, tabular numbers for ELO, gold/silver/bronze metallurgies.
 */
function AnimatedElo({ value }) {
  const count = useCountUp(value, 900);
  return <>{count.toLocaleString()}</>;
}

export default function LeaderboardTable({ entries = [], type = "clans" }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="surface-panel p-8 text-center text-[var(--color-muted)]">
        No rankings available yet. Compete in wars to claim top rank!
      </div>
    );
  }

  const getTierInfo = (elo) => {
    if (elo >= 1650) return { label: "CHAMPION", cls: "badge-tier-champion" };
    if (elo >= 1550) return { label: "DIAMOND", cls: "badge-tier-diamond" };
    if (elo >= 1450) return { label: "PLATINUM", cls: "badge-tier-platinum" };
    if (elo >= 1350) return { label: "GOLD", cls: "badge-tier-gold" };
    if (elo >= 1200) return { label: "SILVER", cls: "badge-tier-silver" };
    return { label: "BRONZE", cls: "badge-tier-bronze" };
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[var(--color-rule-2)] bg-[var(--color-paper-2)]/60 backdrop-blur-md shadow-2xl">
      <table className="table-sheet font-body">
        <thead>
          <tr className="bg-[var(--color-paper-2)]">
            <th className="w-20 pl-6">Rank</th>
            <th>{type === "clans" ? "Clan" : "Warrior"}</th>
            <th className="text-right">Trophies 🏆</th>
            <th className="text-right">ELO Rating</th>
            <th className="text-right">Tier</th>
            <th className="text-right pr-6">Wars Won</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const rank = entry.rank || idx + 1;
            const isFirst = rank === 1;
            const isSecond = rank === 2;
            const isThird = rank === 3;
            const tier = getTierInfo(entry.elo_rating || 1000);

            const rankColor = isFirst
              ? "text-[var(--tier-gold)]"
              : isSecond
              ? "text-[var(--tier-silver)]"
              : isThird
              ? "text-[var(--tier-bronze)]"
              : "text-[var(--color-muted)]";

            const avatarBorder = isFirst
              ? "border-2 border-[var(--tier-gold)] shadow-[0_0_12px_oklch(88%_0.21_85_/_0.5)]"
              : isSecond
              ? "border border-[var(--tier-silver)]"
              : isThird
              ? "border border-[var(--tier-bronze)]"
              : "border border-[var(--color-rule-2)]";

            return (
              <tr
                key={entry.uid || entry.clan_id || idx}
                className={`transition-colors ${
                  isFirst
                    ? "bg-[var(--tier-gold)]/5 hover:bg-[var(--tier-gold)]/10"
                    : "hover:bg-[var(--color-paper-3)]/60"
                }`}
              >
                <td className={`pl-6 font-display text-xl tabular-nums font-extrabold ${rankColor}`}>
                  <div className="flex items-center gap-1.5">
                    {isFirst && <span className="animate-trophy">👑</span>}
                    {isSecond && <span>🥈</span>}
                    {isThird && <span>🥉</span>}
                    <span>#{rank}</span>
                  </div>
                </td>
                <td className="font-bold text-[var(--color-ink)] py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg bg-[var(--color-paper-3)] flex items-center justify-center font-display text-base font-bold text-[var(--color-ink)] ${avatarBorder}`}>
                      {entry.name?.charAt(0)?.toUpperCase() || "C"}
                    </div>
                    <span className="text-base tracking-tight">{entry.name}</span>
                  </div>
                </td>
                <td className="text-right font-mono tabular-nums text-[var(--color-ink)] font-bold">
                  <AnimatedElo value={entry.trophies || 0} />
                </td>
                <td className="text-right font-mono tabular-nums text-[var(--color-accent)] font-bold text-base">
                  <AnimatedElo value={entry.elo_rating || 1000} />
                </td>
                <td className="text-right">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase ${tier.cls}`}>
                    {tier.label}
                  </span>
                </td>
                <td className="text-right pr-6 font-mono tabular-nums text-[var(--color-muted)] font-semibold">
                  {entry.wars_won || 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

