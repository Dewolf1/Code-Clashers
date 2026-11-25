"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import EloChart from "@/components/EloChart";
import { api } from "@/lib/api";
import { sounds } from "@/lib/sounds";

export default function UserProfilePage() {
  const params = useParams();
  const uid = params?.uid || "dev_warrior_01";

  const [eloData, setEloData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getUserEloHistory(uid);
        setEloData(data);
      } catch (err) {
        console.error("Failed to load user ELO history", err);
      } finally {
        setLoading(false);
      }
    }
    if (uid) loadData();
  }, [uid]);

  const currentElo = eloData?.current_elo || 1200;
  const getTier = (elo) => {
    if (elo >= 1650) return { label: "Champion", badge: "badge-tier-champion", border: "border-[var(--tier-champion)]" };
    if (elo >= 1550) return { label: "Diamond I", badge: "badge-tier-diamond", border: "border-[var(--tier-diamond)]" };
    if (elo >= 1450) return { label: "Platinum", badge: "badge-tier-platinum", border: "border-[var(--tier-platinum)]" };
    if (elo >= 1350) return { label: "Gold I", badge: "badge-tier-gold", border: "border-[var(--tier-gold)]" };
    if (elo >= 1200) return { label: "Silver II", badge: "badge-tier-silver", border: "border-[var(--tier-silver)]" };
    return { label: "Bronze I", badge: "badge-tier-bronze", border: "border-[var(--tier-bronze)]" };
  };
  const tier = getTier(currentElo);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in py-6 px-4">
      {/* Header Profile Card (Esports Glassmorphism) */}
      <div className={`surface-elevated p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border rounded-xl shadow-2xl relative overflow-hidden ${tier.border}`}>
        <div className="flex items-center gap-5">
          <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-[var(--color-paper-3)] to-[var(--color-paper-2)] border-2 border-[var(--tier-gold)] flex items-center justify-center font-display text-2xl font-bold text-[var(--tier-gold)] shadow-[0_0_20px_oklch(88%_0.21_85_/_0.3)]">
            {String(uid).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-mono px-2.5 py-0.5 rounded font-bold ${tier.badge}`}>
                {tier.label}
              </span>
              <span className="text-xs font-mono text-[var(--color-muted)]">Verified Combatant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display text-[var(--color-ink)] mt-1 uppercase">
              @{uid}
            </h1>
            <p className="text-xs font-mono text-[var(--color-muted)]">
              Clan Affiliate: <strong className="text-[var(--color-accent)] font-bold">ByteKnights (#KNIGHTS)</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center p-3.5 rounded-xl bg-[var(--color-paper-2)] border border-[var(--tier-gold)]/40 min-w-[100px] shadow-sm">
            <span className="text-[10px] uppercase font-mono text-[var(--color-muted)] font-bold block">Rating</span>
            <strong className="text-2xl font-display text-[var(--tier-gold)] tabular-nums">
              {currentElo}
            </strong>
          </div>
          <div className="text-center p-3.5 rounded-xl bg-[var(--color-paper-2)] border border-[var(--color-rule-2)] min-w-[100px] shadow-sm">
            <span className="text-[10px] uppercase font-mono text-[var(--color-muted)] font-bold block">Rank Tier</span>
            <strong className="text-xl font-display text-[var(--color-ink)] uppercase">
              {tier.label}
            </strong>
          </div>
        </div>
      </div>

      {/* ELO Rating Trajectory Section */}
      <div className="surface-panel p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
          <div>
            <h3 className="text-lg font-display font-bold uppercase text-[var(--color-ink)] flex items-center gap-2">
              <span>📈</span> Competitive ELO Trend & History
            </h3>
            <p className="text-xs font-mono text-[var(--color-muted)]">
              Match performance trajectory computed with K=32 expected logistics
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[var(--color-accent)]">
            Current: {eloData?.current_elo || 1200} ELO
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-[var(--color-muted)]">
            Loading ELO telemetry...
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            <EloChart history={eloData?.history || []} />

            {/* History Table */}
            <div className="overflow-x-auto border border-[var(--color-rule)] rounded-lg">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--color-paper-3)] border-b border-[var(--color-rule)] text-[var(--color-muted)] uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Timeline Milestone</th>
                    <th className="p-3">Rating Snapshot</th>
                    <th className="p-3 text-right">Rating Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {(eloData?.history || []).map((h, idx) => (
                    <tr key={idx} className="hover:bg-[var(--color-paper-2)] transition-colors">
                      <td className="p-3 text-[var(--color-ink)] font-bold">{h.timestamp}</td>
                      <td className="p-3 text-[var(--color-accent)] font-bold">{h.elo} ELO</td>
                      <td className={`p-3 text-right font-bold ${h.delta >= 0 ? "text-[var(--color-ok)]" : "text-[var(--color-bad)]"}`}>
                        {h.delta > 0 ? `+${h.delta}` : h.delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick Navigation Footer */}
      <div className="flex justify-between items-center text-xs font-mono text-[var(--color-muted)]">
        <Link
          href="/leaderboard"
          onClick={() => sounds.playClick()}
          className="text-[var(--color-accent)] hover:underline flex items-center gap-1"
        >
          ← Return to Hall of Fame
        </Link>
        <Link
          href="/wars/demo_war"
          onClick={() => sounds.playClick()}
          className="btn-primary !min-h-[34px] !px-4 text-xs font-mono"
        >
          ⚔️ Go to War Room
        </Link>
      </div>
    </div>
  );
}

