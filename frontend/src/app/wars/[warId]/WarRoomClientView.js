"use client";

import React, { useEffect, useState, useCallback } from "react";
import WarMap from "@/components/WarMap";
import BattleTimer from "@/components/BattleTimer";
import { api } from "@/lib/api";
import { sounds } from "@/lib/sounds";
import WarChatHUD from "@/components/WarChatHUD";
import { useUser } from "@/context/UserContext";

const DEMO_WAR = {
  war_id: "demo_war",
  clan_a_id: "clan_alpha",
  clan_b_id: "clan_omega",
  clan_a_name: "ByteKnights",
  clan_b_name: "Algorithmic Titans",
  status: "battle",
  war_size: 5,
  preparation_start: new Date(Date.now() - 3600000).toISOString(),
  preparation_end: new Date(Date.now() - 1800000).toISOString(),
  battle_start: new Date(Date.now() - 1800000).toISOString(),
  battle_end: new Date(Date.now() + 3600000).toISOString(),
  clan_a_stars: 11,
  clan_b_stars: 9,
  clan_a_destruction: 88.5,
  clan_b_destruction: 74.2,
  problems: [
    { problem_id: "prob_two_sum",        title: "Two Sum Arena",          difficulty: "easy",   max_stars: 3, assigned_to_clan: "clan_alpha", slot_position: 1, stars_earned: 3 },
    { problem_id: "prob_valid_palindrome",title: "Palindrome Fortress",   difficulty: "easy",   max_stars: 3, assigned_to_clan: "clan_alpha", slot_position: 2, stars_earned: 2 },
    { problem_id: "prob_longest_substring",title: "Unbroken Sequence Tower",difficulty: "medium",max_stars: 3, assigned_to_clan: "clan_alpha", slot_position: 3, stars_earned: 2 },
    { problem_id: "prob_max_subarray",   title: "Clan Siege: Max Power",  difficulty: "medium", max_stars: 3, assigned_to_clan: "clan_alpha", slot_position: 4, stars_earned: 1 },
    { problem_id: "prob_two_sum",        title: "Hardened Vault",          difficulty: "hard",   max_stars: 3, assigned_to_clan: "clan_alpha", slot_position: 5, stars_earned: 1 },
    { problem_id: "prob_two_sum",        title: "Two Sum Outpost",         difficulty: "easy",   max_stars: 3, assigned_to_clan: "clan_omega", slot_position: 1, stars_earned: 3 },
    { problem_id: "prob_valid_palindrome",title: "Citadel of Strings",    difficulty: "easy",   max_stars: 3, assigned_to_clan: "clan_omega", slot_position: 2, stars_earned: 3 },
    { problem_id: "prob_longest_substring",title: "Dynamic Stronghold",   difficulty: "medium", max_stars: 3, assigned_to_clan: "clan_omega", slot_position: 3, stars_earned: 3 },
    { problem_id: "prob_max_subarray",   title: "Subarray Redoubt",        difficulty: "medium", max_stars: 3, assigned_to_clan: "clan_omega", slot_position: 4, stars_earned: 2 },
    { problem_id: "prob_two_sum",        title: "Apex Bastion",            difficulty: "hard",   max_stars: 3, assigned_to_clan: "clan_omega", slot_position: 5, stars_earned: 0 },
  ],
};

/* ── Score display ── */
function ScoreBlock({ clanName, stars, destruction, maxStars, isLeading }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-6 ${isLeading ? "text-[var(--color-accent)]" : "text-[var(--color-ink)]"}`}>
      <span className="text-xs font-mono text-[var(--color-muted)] uppercase font-bold tracking-wide truncate max-w-[140px]">
        {clanName}
      </span>
      <span className="text-5xl font-display font-extrabold tabular-nums leading-none">
        {stars}
      </span>
      <div className="flex items-center gap-1 text-xs font-mono text-[var(--color-muted)]">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
        <span>{stars} / {maxStars} stars</span>
      </div>
      <span className="text-xs font-mono text-[var(--color-muted)]">{destruction.toFixed(1)}% destruction</span>
      {isLeading && (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)] mt-1 uppercase">
          Leading
        </span>
      )}
    </div>
  );
}

function ScoreBanner({ war }) {
  const maxStars = (war.war_size || 5) * 3;
  const aLeading = war.clan_a_stars > war.clan_b_stars;
  const bLeading = war.clan_b_stars > war.clan_a_stars;
  const tied     = war.clan_a_stars === war.clan_b_stars;

  const aBarW = Math.min(100, (war.clan_a_stars / maxStars) * 100);
  const bBarW = Math.min(100, (war.clan_b_stars / maxStars) * 100);

  return (
    <div className="surface-panel border-t-2 border-t-[var(--color-accent)] overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-paper-3)] border-b border-[var(--color-rule)]">
        <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">
          {war.status === "battle" ? "Battle Day — Live" : war.status === "preparation" ? "Preparation Day" : "War Ended"}
        </span>
        <div className="flex items-center gap-2">
          {war.status === "battle" && (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--color-ok)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ok)] animate-ping" />
              LIVE
            </span>
          )}
          <span className="text-xs font-mono text-[var(--color-muted)] font-bold">
            {war.war_size}v{war.war_size}
          </span>
        </div>
      </div>

      {/* Score grid */}
      <div className="grid grid-cols-3 items-center gap-4 p-6">
        <ScoreBlock
          clanName={war.clan_a_name}
          stars={war.clan_a_stars}
          destruction={war.clan_a_destruction}
          maxStars={maxStars}
          isLeading={aLeading}
        />

        {/* VS Divider */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl font-display text-[var(--color-muted)]">VS</span>
          {tied && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--color-warn-soft)] text-[var(--color-warn)] border border-[var(--color-warn)] uppercase">
              Tied
            </span>
          )}
          {war.battle_end && war.status === "battle" && (
            <BattleTimer endTime={war.battle_end} />
          )}
        </div>

        <ScoreBlock
          clanName={war.clan_b_name}
          stars={war.clan_b_stars}
          destruction={war.clan_b_destruction}
          maxStars={maxStars}
          isLeading={bLeading}
        />
      </div>

      {/* Dual progress bars */}
      <div className="px-6 pb-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--color-muted)] w-24 truncate">{war.clan_a_name}</span>
          <div className="flex-1 progress-bar">
            <div className="progress-bar__fill" style={{ width: `${aBarW}%`, background: aLeading ? "var(--color-accent)" : "var(--color-ok)" }} />
          </div>
          <span className="text-[10px] font-mono font-bold text-[var(--color-ink)] w-8 text-right tabular-nums">{war.clan_a_stars}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--color-muted)] w-24 truncate">{war.clan_b_name}</span>
          <div className="flex-1 progress-bar">
            <div className="progress-bar__fill" style={{ width: `${bBarW}%`, background: bLeading ? "var(--color-accent)" : "var(--color-cool)" }} />
          </div>
          <span className="text-[10px] font-mono font-bold text-[var(--color-ink)] w-8 text-right tabular-nums">{war.clan_b_stars}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Attacks remaining widget ── */
function AttacksRemaining({ used = 0, total = 2 }) {
  const remaining = total - used;
  return (
    <div className="surface-panel px-4 py-3 flex items-center gap-4">
      <div>
        <span className="text-xs font-mono text-[var(--color-muted)] uppercase font-bold block">Your Attacks</span>
        <span className="text-sm font-display text-[var(--color-ink)]">{remaining} remaining</span>
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded flex items-center justify-center ${
              i < used
                ? "bg-[var(--color-paper-3)] border border-[var(--color-rule)]"
                : "bg-[var(--color-accent)] border border-[var(--color-accent)]"
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </div>
        ))}
      </div>
      <div className="flex-1">
        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${((total - used) / total) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function WarRoomClientView({ warId }) {
  const [war, setWar] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWar = useCallback(async () => {
    if (warId === "demo_war") {
      setWar(DEMO_WAR);
      setLoading(false);
      return;
    }
    try {
      const data = await api.getWar(warId);
      setWar(data);
    } catch {
      setWar({ ...DEMO_WAR, war_id: warId });
    } finally {
      setLoading(false);
    }
  }, [warId]);

  useEffect(() => {
    fetchWar();
  }, [fetchWar]);

  // Poll every 10 seconds during battle day
  useEffect(() => {
    if (!war || war.status !== "battle" || warId === "demo_war") return;
    const interval = setInterval(fetchWar, 10000);
    return () => clearInterval(interval);
  }, [war, warId, fetchWar]);

  if (loading) {
    return (
      <div className="arena-container py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-rule-2)]" />
            <div className="absolute inset-1 rounded-full border-2 border-t-[var(--color-accent)] border-r-[var(--color-accent)] border-b-transparent border-l-transparent animate-radar" />
          </div>
          <p className="text-sm font-mono text-[var(--color-muted)]">Synchronizing battlefield telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="arena-container py-8 space-y-5">
      {/* Battlefield coordinates header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--color-muted)]">
          BATTLEFIELD: {warId?.toUpperCase()}
        </span>
        <button
          type="button"
          onClick={() => { sounds.playClick(); fetchWar(); }}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--color-accent)] hover:underline"
          title="Refresh war state"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Score Banner — sticky at top while scrolling */}
      <div className="sticky top-[64px] z-[var(--z-sticky)] pt-1">
        <ScoreBanner war={war} />
      </div>

      {/* Attacks remaining */}
      <AttacksRemaining used={0} total={2} />

      {/* War Map */}
      <WarMap war={war} currentClanId={war?.clan_a_id} userAttacksRemaining={2} />
      <WarChatHUD
        warId={war?.war_id}
        clanId={war?.clan_a_id}
        clanAId={war?.clan_a_id}
        clanAName={war?.clan_a_name}
        clanBName={war?.clan_b_name}
        currentHandle={typeof window !== "undefined" ? (localStorage.getItem("coc_auth_token") || "Warrior") : "Warrior"}
      />
    </div>
  );
}
