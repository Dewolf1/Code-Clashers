"use client";

import React, { useEffect, useState } from "react";
import LeaderboardTable from "@/components/LeaderboardTable";
import { api } from "@/lib/api";

const DEFAULT_CLANS = [
  { rank: 1, name: "ByteKnights", trophies: 3420, elo_rating: 1680, wars_won: 24 },
  { rank: 2, name: "Algorithmic Titans", trophies: 3180, elo_rating: 1610, wars_won: 21 },
  { rank: 3, name: "Syntax Vanguards", trophies: 2950, elo_rating: 1540, wars_won: 19 },
  { rank: 4, name: "Quantum Coders", trophies: 2710, elo_rating: 1480, wars_won: 16 },
  { rank: 5, name: "Recursion Realm", trophies: 2420, elo_rating: 1390, wars_won: 13 },
];

const DEFAULT_WARRIORS = [
  { rank: 1, name: "AlphaPrime", trophies: 1420, elo_rating: 1720, wars_won: 24 },
  { rank: 2, name: "ZeroDaySniper", trophies: 1380, elo_rating: 1690, wars_won: 22 },
  { rank: 3, name: "CipherWarlock", trophies: 1250, elo_rating: 1630, wars_won: 20 },
  { rank: 4, name: "BitMaster", trophies: 1190, elo_rating: 1590, wars_won: 18 },
  { rank: 5, name: "NullPointer", trophies: 1110, elo_rating: 1520, wars_won: 17 },
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("clans"); // clans | warriors
  const [clanEntries, setClanEntries] = useState(DEFAULT_CLANS);
  const [warriorEntries, setWarriorEntries] = useState(DEFAULT_WARRIORS);

  useEffect(() => {
    async function loadData() {
      try {
        if (activeTab === "clans") {
          const data = await api.getClanLeaderboard();
          if (data && data.length > 0) setClanEntries(data);
        } else {
          const data = await api.getUserLeaderboard();
          if (data && data.length > 0) setWarriorEntries(data);
        }
      } catch {
        // Fallback to static leaderboard data
      }
    }
    loadData();
  }, [activeTab]);

  return (
    <div className="arena-container py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-rule-2)] pb-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-[var(--color-accent)] font-semibold">
            Hall of Glory
          </span>
          <h1 className="text-4xl font-display text-[var(--color-ink)] uppercase mt-1">
            Global Rankings
          </h1>
        </div>

        {/* Tab switcher */}
        <div className="inline-flex rounded p-1 bg-[var(--color-paper-2)] border border-[var(--color-rule)]">
          <button
            type="button"
            onClick={() => setActiveTab("clans")}
            className={`px-4 py-1.5 text-xs font-mono font-bold uppercase rounded transition-colors ${
              activeTab === "clans"
                ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            Clans Leaderboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("warriors")}
            className={`px-4 py-1.5 text-xs font-mono font-bold uppercase rounded transition-colors ${
              activeTab === "warriors"
                ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            Individual Warriors
          </button>
        </div>
      </div>

      {/* Results sheet table */}
      <div className="surface-panel p-6">
        <LeaderboardTable
          entries={activeTab === "clans" ? clanEntries : warriorEntries}
          type={activeTab}
        />
      </div>
    </div>
  );
}

