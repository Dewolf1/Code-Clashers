"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function WarsHubPage() {
  const [activeWar, setActiveWar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const me = await api.getMe();
        if (me.clan_id) {
          const war = await api.getActiveWar(me.clan_id);
          setActiveWar(war);
        }
      } catch {
        // Fallback demo state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="arena-container py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-rule-2)] pb-6">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-[var(--color-accent)] font-semibold">
            War Operations
          </span>
          <h1 className="text-4xl font-display text-[var(--color-ink)] uppercase mt-1">
            Clan War Frontlines
          </h1>
        </div>
        <Link href="/clans" className="btn-primary !min-h-[42px] !px-6">
          ⚔️ Clan War Headquarters
        </Link>
      </div>

      {loading ? (
        <div className="surface-panel p-12 text-center text-[var(--color-muted)] font-mono">
          Loading war battlefield communications...
        </div>
      ) : activeWar ? (
        <div className="surface-panel p-8 space-y-4 border-2 border-[var(--color-accent)]">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-[var(--color-accent-soft)] text-[var(--color-accent)] rounded font-mono text-xs font-bold uppercase">
              Active War in Progress
            </span>
            <span className="text-xs font-mono text-[var(--color-muted)]">
              War ID: {activeWar.war_id}
            </span>
          </div>
          <h2 className="text-3xl font-display text-[var(--color-ink)]">
            {activeWar.clan_a_name} VS {activeWar.clan_b_name}
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Battle day is underway. Mobilize your attacks and claim stars for your clan.
          </p>
          <div className="pt-2">
            <Link href={`/wars/${activeWar.war_id}`} className="btn-primary">
              Enter War Room
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="surface-panel p-8 text-center space-y-4">
            <h2 className="text-2xl font-display text-[var(--color-ink)]">
              NO ACTIVE WAR DETECTED
            </h2>
            <p className="text-sm text-[var(--color-muted)] max-w-lg mx-auto">
              Your clan is not currently deployed in a war. Clan leaders and elders can initiate 5v5, 10v10, or 15v15 matchmaking.
            </p>
            <div className="flex items-center justify-center gap-4 pt-2">
              <Link href="/clans" className="btn-primary">
                Search for Clan War
              </Link>
              <Link href="/wars/demo_war" className="btn-secondary">
                Spectate Demo War Arena
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

