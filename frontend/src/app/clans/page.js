"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { sounds } from "@/lib/sounds";

const DEFAULT_CLAN = {
  clan_id: "clan_alpha",
  name: "ByteKnights",
  tag: "#KNIGHTS",
  description: "Elite competitive algorithmic combatants. Conquer the ladder, leave no base standing.",
  member_count: 5,
  max_members: 15,
  clan_trophies: 2840,
  clan_elo: 1420,
  wars_won: 18,
  wars_lost: 3,
  war_win_streak: 6,
  level: 8,
};

const DEFAULT_MEMBERS = [
  { uid: "u1", name: "AlphaPrime",   role: "Leader", trophies: 1240, elo: 1580, attacks: 2, stars: 6 },
  { uid: "u2", name: "CipherWarlock",role: "Elder",  trophies: 980,  elo: 1450, attacks: 2, stars: 5 },
  { uid: "u3", name: "NullPointer",  role: "Elder",  trophies: 870,  elo: 1390, attacks: 1, stars: 3 },
  { uid: "u4", name: "ByteStorm",    role: "Member", trophies: 620,  elo: 1220, attacks: 2, stars: 4 },
  { uid: "u5", name: "BitShifter",   role: "Member", trophies: 450,  elo: 1100, attacks: 0, stars: 0 },
];

const WAR_HISTORY = [
  { id: "w1", opponent: "Segfault Raiders",  result: "win",  stars: "28/30", date: "Oct 28" },
  { id: "w2", opponent: "Runtime Royals",    result: "win",  stars: "25/30", date: "Oct 22" },
  { id: "w3", opponent: "Stack Smashers",    result: "win",  stars: "27/30", date: "Oct 16" },
  { id: "w4", opponent: "Null Terminators",  result: "loss", stars: "18/30", date: "Oct 09" },
  { id: "w5", opponent: "Memory Leakers",    result: "win",  stars: "30/30", date: "Oct 02" },
];

const ROLE_COLORS = {
  Leader: { bg: "var(--color-accent-soft)", border: "var(--color-accent)", text: "var(--color-accent)" },
  Elder:  { bg: "var(--color-cool-soft)",   border: "var(--color-cool)",   text: "var(--color-cool)" },
  Member: { bg: "var(--color-paper-3)",     border: "var(--color-rule-2)", text: "var(--color-muted)" },
};

const AVATAR_COLORS = [
  "oklch(72% 0.195 45)",
  "oklch(72% 0.13 240)",
  "oklch(76% 0.16 150)",
  "oklch(68% 0.18 25)",
  "oklch(80% 0.15 85)",
];

function MemberAvatar({ name, index }) {
  const initial = name?.[0]?.toUpperCase() || "?";
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center font-display font-extrabold text-sm text-[var(--color-paper)] shrink-0"
      style={{ background: bg }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

function ClanBadge({ level }) {
  return (
    <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--tier-gold)] text-[var(--color-accent-ink)] font-display text-3xl font-extrabold flex flex-col items-center justify-center shadow-[0_0_25px_oklch(88%_0.21_85_/_0.35)]">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
      <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--tier-gold)] border-2 border-[var(--color-paper)] text-[var(--color-paper)] text-[10px] font-bold flex items-center justify-center font-mono shadow-sm">
        {level}
      </span>
    </div>
  );
}

function MatchmakingSearching({ timer, onCancel }) {
  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="flex items-center gap-3">
        {/* Radar animation */}
        <div className="relative w-8 h-8 shrink-0">
          <div className="absolute inset-0 rounded-full border border-[var(--color-rule-2)]" />
          <div className="absolute inset-0.5 rounded-full border border-t-[var(--color-accent)] border-r-[var(--color-accent)] border-b-transparent border-l-transparent animate-radar" />
        </div>
        <div>
          <p className="text-xs font-mono text-[var(--color-accent)] font-bold animate-pulse">
            Scanning for opponents...
          </p>
          <p className="text-xs font-mono text-[var(--color-muted)] tabular-nums">{formatTimer(timer)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="btn-secondary !min-h-[36px] !px-4 text-xs font-mono shrink-0"
      >
        Cancel Search
      </button>
    </div>
  );
}

export default function ClansPage() {
  const [clan] = useState(DEFAULT_CLAN);
  const [isSearching, setIsSearching] = useState(false);
  const [warSize, setWarSize] = useState(5);
  const [searchTimer, setSearchTimer] = useState(0);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;
    if (isSearching) {
      timer = setInterval(() => setSearchTimer((p) => p + 1), 1000);
    } else {
      setSearchTimer(0);
    }
    return () => clearInterval(timer);
  }, [isSearching]);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleStartSearch = async () => {
    sounds.playAttack();
    setIsSearching(true);
    try {
      const res = await api.searchWar(warSize);
      if (res.status === "matched" && res.war_id) {
        showToast("Opponent found! Entering war room...", "success");
        sounds.playSuccess();
        setTimeout(() => { window.location.href = `/wars/${res.war_id}`; }, 800);
      } else {
        // Keep searching
        setTimeout(() => {
          setIsSearching(false);
          showToast("Demo: Entering war room...", "info");
          setTimeout(() => { window.location.href = "/wars/demo_war"; }, 600);
        }, 3000);
      }
    } catch {
      // Demo mode: simulate finding a match after 3s
      setTimeout(() => {
        setIsSearching(false);
        showToast("Match found! Entering demo war room...", "success");
        sounds.playSuccess();
        setTimeout(() => { window.location.href = "/wars/demo_war"; }, 600);
      }, 3000);
    }
  };

  const handleCancelSearch = async () => {
    sounds.playClick();
    setIsSearching(false);
    try { await api.cancelWarSearch(); } catch {}
  };

  const winRate = Math.round((clan.wars_won / (clan.wars_won + clan.wars_lost)) * 100);

  return (
    <div className="arena-container py-12 space-y-8">

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`} role="alert" aria-live="polite">
          {toast.msg}
        </div>
      )}

      {/* ── Clan Banner (Glassmorphism & Metallurgy) ── */}
      <div className="surface-elevated p-6 sm:p-8 space-y-6 border-t-3 border-t-[var(--tier-gold)] shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-xl animate-fade-in relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Left: clan identity */}
          <div className="flex items-center gap-4">
            <ClanBadge level={clan.level} />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-display text-[var(--color-ink)] uppercase">
                  {clan.name}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] text-[var(--tier-gold)] font-bold">
                  {clan.tag}
                </span>
              </div>
              <p className="text-sm text-[var(--color-muted)] mt-1 max-w-xl font-body">
                {clan.description}
              </p>
            </div>
          </div>

          {/* Right: key stats with metallic tiers */}
          <div className="grid grid-cols-3 gap-4 shrink-0">
            <div className="stat-card border-[var(--tier-gold)]/30">
              <span className="stat-card__label">Clan ELO</span>
              <span className="stat-card__value text-[var(--tier-gold)]">{clan.clan_elo}</span>
            </div>
            <div className="stat-card border-[var(--color-ok)]/30">
              <span className="stat-card__label">Win Rate</span>
              <span className="stat-card__value text-[var(--color-ok)]">{winRate}%</span>
            </div>
            <div className="stat-card border-[var(--color-accent)]/30">
              <span className="stat-card__label">Win Streak</span>
              <span className="stat-card__value text-[var(--color-accent)] flex items-center justify-center gap-1">
                {clan.war_win_streak}
                <span className="text-lg animate-pulse">🔥</span>
              </span>
            </div>
          </div>
        </div>

        {/* Members capacity bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--color-muted)]">
            <span>Members</span>
            <span className="font-bold text-[var(--color-ink)]">{clan.member_count} / {clan.max_members}</span>
          </div>
          <div className="progress-bar h-1.5">
            <div className="progress-bar__fill" style={{ width: `${(clan.member_count / clan.max_members) * 100}%` }} />
          </div>
        </div>

        {/* War Matchmaking */}
        <div className="p-4 rounded-lg bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-mono uppercase text-[var(--color-muted)] font-bold">
              War Format:
            </span>
            <div className="inline-flex rounded border border-[var(--color-rule)] bg-[var(--color-paper)] p-1 text-xs font-mono">
              {[5, 10, 15].map((size) => (
                <button
                  key={size}
                  type="button"
                  disabled={isSearching}
                  onClick={() => { sounds.playClick(); setWarSize(size); }}
                  className={`px-3 py-1.5 font-bold rounded transition-colors ${
                    warSize === size
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {size}v{size}
                </button>
              ))}
            </div>
          </div>

          {isSearching ? (
            <MatchmakingSearching timer={searchTimer} onCancel={handleCancelSearch} />
          ) : (
            <button
              type="button"
              onClick={handleStartSearch}
              className="btn-primary !min-h-[42px] !px-8 text-sm"
            >
              <svg className="mr-2" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              Declare War ({warSize}v{warSize})
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Wars Won",        value: clan.wars_won,   color: "var(--color-ok)" },
          { label: "Wars Lost",       value: clan.wars_lost,  color: "var(--color-bad)" },
          { label: "Clan Trophies",   value: clan.clan_trophies.toLocaleString(), color: "var(--color-accent)" },
          { label: "Members",         value: `${clan.member_count}/${clan.max_members}`, color: "var(--color-ink)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card__label">{s.label}</span>
            <span className="stat-card__value" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Roster ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule-2)]">
          <h2 className="text-xl font-display text-[var(--color-ink)] uppercase">
            Active Combat Roster
          </h2>
          <span className="text-xs font-mono text-[var(--color-muted)]">
            {DEFAULT_MEMBERS.length} members
          </span>
        </div>

        <div className="surface-panel overflow-hidden">
          <table className="table-sheet font-body">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Warrior</th>
                <th>Role</th>
                <th className="text-right hidden sm:table-cell">Stars</th>
                <th className="text-right hidden md:table-cell">Trophies</th>
                <th className="text-right">ELO</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_MEMBERS.map((m, idx) => {
                const rc = ROLE_COLORS[m.role] || ROLE_COLORS.Member;
                return (
                  <tr key={m.uid} className="transition-colors">
                    <td className="font-mono text-xs text-[var(--color-muted)] tabular-nums">{idx + 1}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <MemberAvatar name={m.name} index={idx} />
                        <span className="font-bold text-[var(--color-ink)]">{m.name}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-mono font-bold uppercase border"
                        style={{
                          background: rc.bg,
                          borderColor: rc.border,
                          color: rc.text,
                        }}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="text-right font-mono tabular-nums text-[var(--color-accent)] hidden sm:table-cell">
                      <span className="font-bold">{m.stars}</span>
                      <span className="text-[var(--color-muted)] text-xs">/{m.attacks * 3}</span>
                    </td>
                    <td className="text-right font-mono tabular-nums text-[var(--color-ink-2)] hidden md:table-cell">
                      {m.trophies.toLocaleString()} 🏆
                    </td>
                    <td className="text-right font-mono tabular-nums text-[var(--color-accent)] font-bold">
                      {m.elo}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── War History ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule-2)]">
          <h2 className="text-xl font-display text-[var(--color-ink)] uppercase">War History</h2>
          <span className="text-xs font-mono text-[var(--color-ok)] font-bold">
            {winRate}% win rate
          </span>
        </div>

        <div className="surface-panel overflow-hidden">
          <table className="table-sheet font-body">
            <thead>
              <tr>
                <th>Opponent</th>
                <th>Result</th>
                <th className="text-right hidden sm:table-cell">Stars</th>
                <th className="text-right">Date</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {WAR_HISTORY.map((w) => (
                <tr key={w.id} className="transition-colors">
                  <td className="font-bold text-[var(--color-ink)]">{w.opponent}</td>
                  <td>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold uppercase border ${
                        w.result === "win"
                          ? "badge-easy"
                          : "badge-hard"
                      }`}
                    >
                      {w.result === "win" ? "Victory" : "Defeat"}
                    </span>
                  </td>
                  <td className="text-right font-mono tabular-nums text-[var(--color-muted)] hidden sm:table-cell">
                    {w.stars}
                  </td>
                  <td className="text-right font-mono text-xs text-[var(--color-muted)]">{w.date}</td>
                  <td className="text-right">
                    <Link
                      href={`/wars/${w.id}`}
                      onClick={() => sounds.playClick()}
                      className="text-xs font-mono text-[var(--color-accent)] hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
