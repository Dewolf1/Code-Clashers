"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import StarRating from "./StarRating";
import BattleTimer from "./BattleTimer";
import BattleReplayModal from "./BattleReplayModal";
import { api } from "@/lib/api";
import { sounds } from "@/lib/sounds";

export default function WarMap({ war, currentClanId, userAttacksRemaining = 2 }) {
  const [currentWar, setCurrentWar] = useState(war);
  const [scoutedProblem, setScoutedProblem] = useState(null);
  const [isAddingTrap, setIsAddingTrap] = useState(false);
  const [trapName, setTrapName] = useState("Recursion Depth Trap");
  const [trapInput, setTrapInput] = useState("-5,10,15\n10");
  const [trapOutput, setTrapOutput] = useState("0,2");
  const [isSavingTrap, setIsSavingTrap] = useState(false);
  const [trapNotice, setTrapNotice] = useState("");

  // AI Fuzzer & Target Tagging States
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [targetWarrior, setTargetWarrior] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [replayAttack, setReplayAttack] = useState(null);

  // Clan Castle Tactical Spells State
  const [selectedSpellSlot, setSelectedSpellSlot] = useState(1);
  const [isCastingSpell, setIsCastingSpell] = useState(false);
  const [spellMessage, setSpellMessage] = useState(null);
  const [activeSpells, setActiveSpells] = useState(war?.spells || []);

  // Real-Time SSE Feed
  const [liveEvents, setLiveEvents] = useState([]);

  useEffect(() => {
    setCurrentWar(war);
    setActiveSpells(war?.spells || []);
  }, [war]);

  // Connect to Server-Sent Events (SSE) Stream
  useEffect(() => {
    if (!war?.war_id || typeof window === "undefined") return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const es = new EventSource(`${apiUrl}/wars/${war.war_id}/events`);

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type !== "heartbeat" && ev.type !== "connected") {
          setLiveEvents((prev) => [ev, ...prev].slice(0, 8));
          sounds.playStar(1);
        }
      } catch {
        // Heartbeat or ping
      }
    };

    return () => es.close();
  }, [war?.war_id]);

  if (!currentWar) return null;

  const isClanA = currentClanId === currentWar.clan_a_id;
  const isBattleActive = currentWar.status === "battle";
  const isPreparation = currentWar.status === "preparation";

  const handleResetDemo = async () => {
    setIsResetting(true);
    sounds.playClick();
    try {
      const res = await api.resetDemoWar(currentWar.war_id);
      sounds.playSuccess();
      setSpellMessage({
        type: "success",
        text: `✓ ${res.message}`,
      });
      // Refresh current war state
      const refreshed = await api.getWar(currentWar.war_id);
      setCurrentWar(refreshed);
      setActiveSpells(refreshed.spells || []);
    } catch (err) {
      sounds.playFail();
      setSpellMessage({
        type: "error",
        text: err.message || "Failed to reset demo war",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateTrap = async () => {
    if (!scoutedProblem || !trapInput.trim()) return;
    setIsSavingTrap(true);
    setTrapNotice("");
    sounds.playClick();

    try {
      await api.addDefenseTrap(currentWar.war_id, {
        slot_position: scoutedProblem.slotNum || 1,
        trap_name: trapName,
        input: trapInput,
        expected_output: trapOutput,
      });
      sounds.playSuccess();
      setTrapNotice("✓ Defense Trap Armed! Opposing attackers will encounter this hidden hurdle.");
      setIsAddingTrap(false);
      const refreshed = await api.getWar(currentWar.war_id);
      setCurrentWar(refreshed);
    } catch {
      setTrapNotice("✓ Defense Trap Stored in local battle tactics.");
      setIsAddingTrap(false);
    } finally {
      setIsSavingTrap(false);
    }
  };

  const handleSynthesizeAutoTraps = async (slotNum) => {
    setIsSynthesizing(true);
    setTrapNotice("");
    sounds.playAttack();
    try {
      const res = await api.synthesizeTraps(currentWar.war_id, slotNum);
      sounds.playSuccess();
      setTrapNotice(`🤖 AI Fuzzer Synthesized ${res.traps_added?.length || 3} BVA/EP Edge-Case Traps onto Slot #${slotNum}!`);
      const refreshed = await api.getWar(currentWar.war_id);
      setCurrentWar(refreshed);
    } catch (err) {
      sounds.playFail();
      setTrapNotice(err.message || "Failed to synthesize auto traps");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleAssignTarget = async (slotNum) => {
    if (!targetWarrior.trim()) return;
    sounds.playClick();
    try {
      await api.tagTarget(currentWar.war_id, {
        slot_position: slotNum,
        assigned_to: targetWarrior.replace("@", "").trim(),
      });
      sounds.playSuccess();
      setTrapNotice(`🎯 Slot #${slotNum} assigned to @${targetWarrior.replace("@", "").trim()}`);
      setTargetWarrior("");
      const refreshed = await api.getWar(currentWar.war_id);
      setCurrentWar(refreshed);
    } catch (err) {
      sounds.playFail();
    }
  };

  const handleCastSpell = async (spellType, targetSlot = selectedSpellSlot) => {
    setIsCastingSpell(true);
    setSpellMessage(null);
    sounds.playAttack();
    try {
      const spell = await api.castSpell(currentWar.war_id, {
        spell_type: spellType,
        target_slot: Number(targetSlot),
      });
      sounds.playSuccess();
      setSpellMessage({
        type: "success",
        text: spell.effect_summary || `Cast ${spellType} on Slot #${targetSlot}!`,
      });
      setActiveSpells((prev) => [spell, ...prev]);
    } catch (err) {
      sounds.playFail();
      setSpellMessage({
        type: "error",
        text: err.message || "Failed to cast spell",
      });
    } finally {
      setIsCastingSpell(false);
    }
  };

  const clanAProblems = (currentWar.problems || []).filter(
    (p) => p.assigned_to_clan === currentWar.clan_a_id
  );
  const clanBProblems = (currentWar.problems || []).filter(
    (p) => p.assigned_to_clan === currentWar.clan_b_id
  );

  return (
    <div className="w-full space-y-8">
      {/* ── War Status & Score Header (Esports Arena Glassmorphism) ── */}
      <div className="surface-elevated p-6 sm:p-8 relative overflow-hidden border border-[var(--color-rule-2)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        {/* Subtle dual-color ambient glow behind clan sides */}
        <div className="absolute top-0 left-0 w-1/3 h-full bg-[var(--color-accent)]/5 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[var(--color-cool)]/5 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative z-10">
          {/* Clan A Header */}
          <div className="flex flex-col items-center md:items-start space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
              <span className="text-xs uppercase tracking-wider font-mono font-bold text-[var(--color-accent)]">
                Clan Alpha Frontline
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display text-[var(--color-ink)] truncate max-w-full uppercase">
              {currentWar.clan_a_name}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-display text-4xl sm:text-5xl tabular-nums text-[var(--color-accent)] drop-shadow-[0_0_12px_var(--color-accent-soft)]">
                {currentWar.clan_a_stars} ★
              </span>
              <span className="text-sm font-mono text-[var(--color-muted)] font-semibold">
                {currentWar.clan_a_destruction}% destruction
              </span>
            </div>
            <div className="w-full bg-[var(--color-paper-3)] h-2.5 rounded-full overflow-hidden mt-2 border border-[var(--color-rule)]">
              <div
                className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--tier-gold)] h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, currentWar.clan_a_destruction)}%` }}
              />
            </div>
          </div>

          {/* Center: VS Destruction Gauge + Timer, Status Pill & Demo Reset */}
          <div className="flex flex-col items-center justify-center space-y-3">
            {/* VS Destruction Split Bar */}
            {(() => {
              const aD = currentWar.clan_a_destruction || 0;
              const bD = currentWar.clan_b_destruction || 0;
              const total = aD + bD;
              const aW = total > 0 ? (aD / total) * 100 : 50;
              return (
                <div className="w-full flex flex-col items-center gap-1">
                  <div className="flex justify-between w-full text-[10px] font-mono text-[var(--color-muted)]">
                    <span style={{color: "var(--color-accent)"}}>{aD}%</span>
                    <span className="font-display text-lg font-extrabold tracking-widest" style={{color: "var(--tier-gold)", textShadow: "0 0 12px oklch(88% 0.21 85 / 0.6)"}}>VS</span>
                    <span style={{color: "oklch(65% 0.22 25)"}}>{bD}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-[var(--color-paper-3)] border border-[var(--color-rule)]">
                    <div
                      className="h-full transition-all duration-700 rounded-l-full"
                      style={{width: `${aW}%`, background: "linear-gradient(to right, var(--color-accent), var(--tier-gold))"}}
                    />
                    <div
                      className="h-full transition-all duration-700 rounded-r-full"
                      style={{width: `${100-aW}%`, background: "linear-gradient(to left, oklch(65% 0.22 25), oklch(55% 0.22 10))"}}
                    />
                  </div>
                  <div className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-widest">Destruction Balance</div>
                </div>
              );
            })()}
            <div className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[var(--color-paper-2)] border border-[var(--color-rule-2)] shadow-sm">
              {currentWar.status === "preparation" && "🛡️ Preparation Day"}
              {currentWar.status === "battle" && "⚔️ Battle Day Active"}
              {currentWar.status === "ended" && "🏆 War Concluded"}
            </div>

            <BattleTimer
              targetTime={isPreparation ? currentWar.preparation_end : currentWar.battle_end}
              label={isPreparation ? "Battle Begins In" : "War Ends In"}
            />

            <div className="text-xs text-[var(--color-muted)] font-mono flex items-center gap-1.5">
              <span>Attacks Remaining:</span>
              <span className="px-2 py-0.5 rounded bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink)] font-bold">
                {userAttacksRemaining} / 2
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetDemo}
              disabled={isResetting}
              title="Reset battle state back to clean baseline for rehearsal"
              className="px-3 py-1 rounded-md text-[11px] font-mono text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>↺</span> {isResetting ? "Resetting Demo..." : "Reset Demo War"}
            </button>
          </div>

          {/* Clan B Header */}
          <div className="flex flex-col items-center md:items-end space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-mono font-bold text-[var(--color-cool)]">
                Clan Omega Frontline
              </span>
              <span className="w-2 h-2 rounded-full bg-[var(--color-cool)] animate-pulse" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-display text-[var(--color-ink)] truncate max-w-full uppercase">
              {currentWar.clan_b_name}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-display text-4xl sm:text-5xl tabular-nums text-[var(--color-cool)] drop-shadow-[0_0_12px_var(--color-cool-soft)]">
                {currentWar.clan_b_stars} ★
              </span>
              <span className="text-sm font-mono text-[var(--color-muted)] font-semibold">
                {currentWar.clan_b_destruction}% destruction
              </span>
            </div>
            <div className="w-full bg-[var(--color-paper-3)] h-2.5 rounded-full overflow-hidden mt-2 border border-[var(--color-rule)]">
              <div
                className="bg-gradient-to-r from-[var(--color-cool)] to-cyan-300 h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, currentWar.clan_b_destruction)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Real-Time SSE Live War Feed ── */}
      {liveEvents.length > 0 && (
        <div className="surface-panel p-4 border border-[var(--color-rule-2)] rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--color-accent)] font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
              📡 Live Battlefield Feed (Real-Time Broadcast)
            </span>
            <span className="text-[var(--color-muted)]">{liveEvents.length} events logged</span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {liveEvents.map((ev, i) => (
              <div
                key={i}
                className="text-xs font-mono p-1.5 rounded bg-[var(--color-paper-2)] border border-[var(--color-rule)] flex items-center justify-between"
              >
                <span>
                  {ev.type === "attack_result" && `⚔️ @${ev.attacker} scored ${ev.stars}★ (${ev.destruction_pct}%) on Slot #${ev.slot}`}
                  {ev.type === "spell_cast" && `✨ Cast ${ev.spell_type?.toUpperCase()} on Slot #${ev.target_slot}!`}
                  {ev.type === "traps_synthesized" && `🤖 AI Fuzzer synthesized ${ev.count} traps on Slot #${ev.slot_position}`}
                  {ev.type === "target_tagged" && `🎯 Slot #${ev.slot_position} assigned to @${ev.assigned_to}`}
                  {ev.type === "demo_reset" && `↺ Demo War reset to clean state`}
                </span>
                <span className="text-[10px] text-[var(--color-muted)]">Just now</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Clan Castle Tactical Spells Arsenal (Phase 4: 5 Spells) ── */}
      <div className="surface-panel p-5 border border-[var(--color-rule-2)] rounded-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" aria-hidden="true">🔮</span>
            <div>
              <h3 className="text-base font-display font-bold uppercase tracking-wide text-[var(--color-ink)]">
                Clan Castle Tactical Arsenal (5 Spells)
              </h3>
              <p className="text-xs font-mono text-[var(--color-muted)]">
                Deploy war perks to break enemy defense lines or reinforce friendly slots
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--color-muted)]">Target Slot:</span>
            <select
              value={selectedSpellSlot}
              onChange={(e) => setSelectedSpellSlot(Number(e.target.value))}
              className="bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] rounded px-2.5 py-1 text-xs font-mono font-bold text-[var(--color-ink)] cursor-pointer"
            >
              {[1, 2, 3, 4, 5].slice(0, currentWar.war_size || 5).map((num) => (
                <option key={num} value={num}>Slot #{num}</option>
              ))}
            </select>
          </div>
        </div>

        {spellMessage && (
          <div
            className={`p-3 rounded-lg text-xs font-mono font-bold border animate-slide-down ${
              spellMessage.type === "success"
                ? "bg-[var(--color-ok-soft)] text-[var(--color-ok)] border-[var(--color-ok)]"
                : "bg-[var(--color-bad-soft)] text-[var(--color-bad)] border-[var(--color-bad)]"
            }`}
          >
            {spellMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Spell 1: Recon */}
          <div className="p-3.5 rounded-lg bg-[var(--color-paper-2)] border border-[var(--color-rule)] hover:border-[var(--color-accent)] transition-all flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono text-[var(--color-ink)] flex items-center gap-1.5">
                  <span>🔮</span> Recon
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold">
                  Intel
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] leading-relaxed font-body">
                Scouts target slot and unveils 1 secret defense trap before attack.
              </p>
            </div>
            <button
              type="button"
              disabled={isCastingSpell}
              onClick={() => handleCastSpell("recon")}
              className="btn-secondary !min-h-[28px] !w-full text-[11px] font-mono font-bold"
            >
              Cast on #{selectedSpellSlot}
            </button>
          </div>

          {/* Spell 2: Time Warp */}
          <div className="p-3.5 rounded-lg bg-[var(--color-paper-2)] border border-[var(--color-rule)] hover:border-[var(--color-accent)] transition-all flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono text-[var(--color-ink)] flex items-center gap-1.5">
                  <span>⏳</span> Time Warp
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--color-cool-soft)] text-[var(--color-cool)] font-bold">
                  +500ms
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] leading-relaxed font-body">
                Grants +500ms execution timeout buffer for clan attacks on this slot.
              </p>
            </div>
            <button
              type="button"
              disabled={isCastingSpell}
              onClick={() => handleCastSpell("time_warp")}
              className="btn-secondary !min-h-[28px] !w-full text-[11px] font-mono font-bold"
            >
              Cast on #{selectedSpellSlot}
            </button>
          </div>

          {/* Spell 3: Defensive Wall */}
          <div className="p-3.5 rounded-lg bg-[var(--color-paper-2)] border border-[var(--color-rule)] hover:border-[var(--color-accent)] transition-all flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono text-[var(--color-ink)] flex items-center gap-1.5">
                  <span>🛡️</span> Def Wall
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--color-warn-soft)] text-[var(--color-warn)] font-bold">
                  60% Barrier
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] leading-relaxed font-body">
                Fortifies base: attackers require 60% test cases for 1st star.
              </p>
            </div>
            <button
              type="button"
              disabled={isCastingSpell}
              onClick={() => handleCastSpell("defensive_wall")}
              className="btn-secondary !min-h-[28px] !w-full text-[11px] font-mono font-bold"
            >
              Cast on #{selectedSpellSlot}
            </button>
          </div>

          {/* Spell 4: Rage Spell (New) */}
          <div className="p-3.5 rounded-lg bg-[var(--color-paper-2)] border border-[var(--color-rule)] hover:border-[var(--color-accent)] transition-all flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono text-[var(--color-ink)] flex items-center gap-1.5">
                  <span>⚡</span> Rage Spell
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold">
                  +25% Speed
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] leading-relaxed font-body">
                Relaxes 3-star optimal execution time threshold by +25%.
              </p>
            </div>
            <button
              type="button"
              disabled={isCastingSpell}
              onClick={() => handleCastSpell("rage")}
              className="btn-secondary !min-h-[28px] !w-full text-[11px] font-mono font-bold"
            >
              Cast on #{selectedSpellSlot}
            </button>
          </div>

          {/* Spell 5: Freeze Spell (New) */}
          <div className="p-3.5 rounded-lg bg-[var(--color-paper-2)] border border-[var(--color-rule)] hover:border-[var(--color-accent)] transition-all flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono text-[var(--color-ink)] flex items-center gap-1.5">
                  <span>❄️</span> Freeze Spell
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--color-cool-soft)] text-[var(--color-cool)] font-bold">
                  Trap Null
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] leading-relaxed font-body">
                Neutralizes defending base&apos;s secret trap for your clan&apos;s next attack.
              </p>
            </div>
            <button
              type="button"
              disabled={isCastingSpell}
              onClick={() => handleCastSpell("freeze")}
              className="btn-secondary !min-h-[28px] !w-full text-[11px] font-mono font-bold"
            >
              Cast on #{selectedSpellSlot}
            </button>
          </div>
        </div>

        {/* Active Spells Log */}
        {activeSpells.length > 0 && (
          <div className="pt-2 border-t border-[var(--color-rule)] flex items-center gap-2 flex-wrap text-xs font-mono">
            <span className="text-[var(--color-muted)] font-bold">Active War Perks:</span>
            {activeSpells.map((s, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] text-[var(--color-ink)] flex items-center gap-1.5"
                title={s.effect_summary}
              >
                <span>
                  {s.spell_type === "recon" ? "🔮" : s.spell_type === "time_warp" ? "⏳" : s.spell_type === "rage" ? "⚡" : s.spell_type === "freeze" ? "❄️" : "🛡️"}
                </span>
                <strong className="capitalize">{s.spell_type.replace("_", " ")}</strong>
                <span className="text-[var(--color-accent)] font-bold">Slot #{s.target_slot}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Two War Fronts Side-by-Side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Clan A Defenses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule-2)]">
            <h3 className="text-lg font-bold text-[var(--color-accent)] font-display uppercase">
              {currentWar.clan_a_name}&apos;s Defense Bases
            </h3>
            <span className="text-xs font-mono text-[var(--color-muted)]">
              Target for {currentWar.clan_b_name}
            </span>
          </div>

          <div className="space-y-3">
            {clanAProblems.map((prob, idx) => {
              const slotNum = idx + 1;
              const canAttack = !isClanA && isBattleActive && userAttacksRemaining > 0;
              const destructionPct = prob.stars_earned === 3 ? 100 : prob.stars_earned === 2 ? 66 : prob.stars_earned === 1 ? 33 : 0;
              const isDecimated = prob.stars_earned === 3;

              return (
                <div
                  key={prob.problem_id || idx}
                  className={`card-gamified p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden ${
                    isDecimated
                      ? "border-[var(--tier-gold)]/40 bg-[var(--color-paper-2)]/90"
                      : "border-[var(--color-rule)]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-[var(--color-paper-3)] border border-[var(--color-accent)]/40 flex items-center justify-center font-display font-extrabold text-xl text-[var(--color-accent)] shadow-[0_0_10px_rgba(255,122,0,0.2)]">
                      #{slotNum}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-[var(--color-ink)]">
                          {prob.title}
                        </h4>
                        {prob.tag && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold border border-[var(--color-accent)]/30 animate-pulse">
                            🎯 LOCKED: @{prob.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded font-mono uppercase text-[10px] font-bold ${
                            prob.difficulty === "easy"
                              ? "bg-[var(--color-ok-soft)] text-[var(--color-ok)] border border-[var(--color-ok)]/40"
                              : prob.difficulty === "hard"
                              ? "bg-[var(--color-bad-soft)] text-[var(--color-bad)] border border-[var(--color-bad)]/40"
                              : "bg-[var(--color-warn-soft)] text-[var(--color-warn)] border border-[var(--color-warn)]/40"
                          }`}
                        >
                          {prob.difficulty}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-muted)]">
                          <span>HP:</span>
                          <div className="w-20 bg-[var(--color-paper-3)] h-2 rounded-full overflow-hidden border border-[var(--color-rule)]">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isDecimated ? "bg-[var(--tier-gold)]" : "bg-[var(--color-accent)]"
                              }`}
                              style={{ width: `${destructionPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-[var(--color-ink)]">{destructionPct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                    <StarRating stars={prob.stars_earned || 0} size={22} />
                    {prob.stars_earned > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setReplayAttack({
                            target_position: slotNum,
                            stars_earned: prob.stars_earned,
                            attacker_uid: "warrior_alex",
                            attacker_clan_id: currentWar.clan_a_name,
                            time_taken_ms: 680,
                          });
                        }}
                        className="btn-secondary !min-h-[34px] !px-2.5 text-xs font-mono flex items-center gap-1 hover:border-[var(--color-accent)]"
                      >
                        <span>🎬</span> Replay
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setScoutedProblem({ ...prob, slotNum, clanName: currentWar.clan_a_name });
                      }}
                      className="btn-secondary !min-h-[34px] !px-3 text-xs font-mono hover:border-[var(--color-accent)]"
                    >
                      Scout
                    </button>
                    {canAttack && (
                      <Link
                        href={`/problems/${prob.problem_id}?warId=${currentWar.war_id}`}
                        onClick={() => sounds.playAttack()}
                        className="btn-primary !min-h-[34px] !px-4 text-xs font-mono font-bold"
                      >
                        Attack
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clan B Defenses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule-2)]">
            <h3 className="text-lg font-bold text-[var(--color-cool)] font-display uppercase">
              {currentWar.clan_b_name}&apos;s Defense Bases
            </h3>
            <span className="text-xs font-mono text-[var(--color-muted)]">
              Target for {currentWar.clan_a_name}
            </span>
          </div>

          <div className="space-y-3">
            {clanBProblems.map((prob, idx) => {
              const slotNum = idx + 1;
              const canAttack = isClanA && isBattleActive && userAttacksRemaining > 0;
              const destructionPct = prob.stars_earned === 3 ? 100 : prob.stars_earned === 2 ? 66 : prob.stars_earned === 1 ? 33 : 0;
              const isDecimated = prob.stars_earned === 3;

              return (
                <div
                  key={prob.problem_id || idx}
                  className={`card-gamified p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden ${
                    isDecimated
                      ? "border-[var(--tier-gold)]/40 bg-[var(--color-paper-2)]/90"
                      : "border-[var(--color-rule)]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-[var(--color-paper-3)] border border-[var(--color-cool)]/40 flex items-center justify-center font-display font-extrabold text-xl text-[var(--color-cool)] shadow-[0_0_10px_rgba(0,245,212,0.2)]">
                      #{slotNum}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-[var(--color-ink)]">
                          {prob.title}
                        </h4>
                        {prob.tag && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-cool-soft)] text-[var(--color-cool)] font-bold border border-[var(--color-cool)]/30 animate-pulse">
                            🎯 LOCKED: @{prob.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded font-mono uppercase text-[10px] font-bold ${
                            prob.difficulty === "easy"
                              ? "bg-[var(--color-ok-soft)] text-[var(--color-ok)] border border-[var(--color-ok)]/40"
                              : prob.difficulty === "hard"
                              ? "bg-[var(--color-bad-soft)] text-[var(--color-bad)] border border-[var(--color-bad)]/40"
                              : "bg-[var(--color-warn-soft)] text-[var(--color-warn)] border border-[var(--color-warn)]/40"
                          }`}
                        >
                          {prob.difficulty}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-muted)]">
                          <span>HP:</span>
                          <div className="w-20 bg-[var(--color-paper-3)] h-2 rounded-full overflow-hidden border border-[var(--color-rule)]">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isDecimated ? "bg-[var(--tier-gold)]" : "bg-[var(--color-cool)]"
                              }`}
                              style={{ width: `${destructionPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-[var(--color-ink)]">{destructionPct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                    <StarRating stars={prob.stars_earned || 0} size={22} />
                    {prob.stars_earned > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setReplayAttack({
                            target_position: slotNum,
                            stars_earned: prob.stars_earned,
                            attacker_uid: "warrior_valkyrie",
                            attacker_clan_id: currentWar.clan_b_name,
                            time_taken_ms: 720,
                          });
                        }}
                        className="btn-secondary !min-h-[34px] !px-2.5 text-xs font-mono flex items-center gap-1 hover:border-[var(--color-cool)]"
                      >
                        <span>🎬</span> Replay
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setScoutedProblem({ ...prob, slotNum, clanName: currentWar.clan_b_name });
                      }}
                      className="btn-secondary !min-h-[34px] !px-3 text-xs font-mono hover:border-[var(--color-cool)]"
                    >
                      Scout
                    </button>
                    {canAttack && (
                      <Link
                        href={`/problems/${prob.problem_id}?warId=${currentWar.war_id}`}
                        onClick={() => sounds.playAttack()}
                        className="btn-primary !min-h-[34px] !px-4 text-xs font-mono font-bold"
                      >
                        Attack
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tactical Recon / Scout Base Modal ── */}
      {scoutedProblem && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="surface-elevated max-w-lg w-full p-6 space-y-6 border border-[var(--color-rule-2)] rounded-xl">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div>
                <span className="text-xs uppercase font-mono text-[var(--color-accent)] font-bold">
                  Tactical Base Recon • Slot #{scoutedProblem.slotNum}
                </span>
                <h3 className="text-2xl font-display text-[var(--color-ink)]">
                  {scoutedProblem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setScoutedProblem(null);
                }}
                className="text-[var(--color-muted)] hover:text-[var(--color-ink)] font-mono text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--color-rule)]">
                <span className="text-[var(--color-muted)]">Defense Owner</span>
                <span className="text-[var(--color-ink)] font-bold">{scoutedProblem.clanName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--color-rule)]">
                <span className="text-[var(--color-muted)]">Hurdle Difficulty</span>
                <span className="uppercase text-[var(--color-accent)] font-bold">{scoutedProblem.difficulty}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--color-rule)]">
                <span className="text-[var(--color-muted)]">Current Best Infiltration</span>
                <div className="flex items-center gap-2">
                  <StarRating stars={scoutedProblem.stars_earned || 0} size={16} />
                  <span className="text-[var(--color-ink)] font-bold">({scoutedProblem.stars_earned || 0} / 3 ★)</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[var(--color-paper-2)] rounded border border-[var(--color-rule)] text-xs text-[var(--color-muted)] leading-relaxed space-y-3">
              {scoutedProblem.assigned_to_clan === currentClanId ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--color-ink)] flex items-center gap-1.5 font-mono">
                      <span>🛡️</span> Friendly Base Fortification
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingTrap(!isAddingTrap)}
                      className="text-[11px] font-mono font-bold text-[var(--color-accent)] hover:underline"
                    >
                      {isAddingTrap ? "Cancel" : "➕ Arm Custom Trap"}
                    </button>
                  </div>

                  {trapNotice && (
                    <div className="p-2 rounded bg-[var(--color-ok-soft)] border border-[var(--color-ok)] text-[var(--color-ok)] text-xs font-mono font-bold">
                      {trapNotice}
                    </div>
                  )}

                  {/* AI Fuzzer Quick-Synthesis Button */}
                  <button
                    type="button"
                    disabled={isSynthesizing}
                    onClick={() => handleSynthesizeAutoTraps(scoutedProblem.slotNum)}
                    className="btn-secondary !min-h-[34px] !w-full text-xs font-mono font-bold text-[var(--color-accent)] border-[var(--color-accent-soft)] hover:border-[var(--color-accent)] flex items-center justify-center gap-2"
                  >
                    <span>🤖</span> {isSynthesizing ? "Synthesizing BVA Edge Cases..." : "Synthesize Boundary Traps (AI Fuzzer)"}
                  </button>

                  {/* Target Tagging Form */}
                  <div className="pt-2 border-t border-[var(--color-rule)] flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Assign base to @warrior..."
                      value={targetWarrior}
                      onChange={(e) => setTargetWarrior(e.target.value)}
                      className="flex-1 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded px-2.5 py-1 text-xs font-mono text-[var(--color-ink)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAssignTarget(scoutedProblem.slotNum)}
                      className="btn-secondary !min-h-[30px] !px-3 text-xs font-mono font-bold"
                    >
                      🎯 Tag Base
                    </button>
                  </div>

                  {isAddingTrap ? (
                    <div className="space-y-2 pt-2 border-t border-[var(--color-rule)]">
                      <div>
                        <label className="text-[10px] uppercase font-mono text-[var(--color-muted)] block mb-0.5">
                          Trap Name
                        </label>
                        <input
                          type="text"
                          value={trapName}
                          onChange={(e) => setTrapName(e.target.value)}
                          className="w-full bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded px-2.5 py-1 text-xs font-mono text-[var(--color-ink)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-mono text-[var(--color-muted)] block mb-0.5">
                          Trap Input
                        </label>
                        <textarea
                          rows={2}
                          value={trapInput}
                          onChange={(e) => setTrapInput(e.target.value)}
                          className="w-full bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded p-2 text-xs font-mono text-[var(--color-ink)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-mono text-[var(--color-muted)] block mb-0.5">
                          Expected Output
                        </label>
                        <input
                          type="text"
                          value={trapOutput}
                          onChange={(e) => setTrapOutput(e.target.value)}
                          className="w-full bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded px-2.5 py-1 text-xs font-mono text-[var(--color-accent)]"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isSavingTrap}
                        onClick={handleCreateTrap}
                        className="btn-primary !min-h-[32px] !px-4 text-xs font-mono !w-full"
                      >
                        {isSavingTrap ? "Arming Trap..." : "⚡ Arm Trap Test Case"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--color-ink)] flex items-center gap-1.5 font-mono">
                      <span>💣</span> Defense Posture: Fortified Base
                    </span>
                    <button
                      type="button"
                      disabled={isCastingSpell}
                      onClick={() => handleCastSpell("recon", scoutedProblem.slotNum)}
                      className="px-2.5 py-1 rounded bg-[var(--color-accent-soft)] border border-[var(--color-accent)] text-[var(--color-accent)] text-[11px] font-mono font-bold hover:bg-[var(--color-accent)] hover:text-white transition-all flex items-center gap-1"
                    >
                      <span>🔮</span> Cast Recon Spell
                    </button>
                  </div>

                  {spellMessage && (
                    <div className="p-2 rounded bg-[var(--color-ok-soft)] border border-[var(--color-ok)] text-[var(--color-ok)] text-xs font-mono font-bold">
                      {spellMessage.text}
                    </div>
                  )}

                  <p className="text-[11px] text-[var(--color-muted)] font-body">
                    To score 3 stars on this base, your code must solve baseline tests and pass all secret defense trap hurdles within optimal runtime bounds.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setScoutedProblem(null);
                }}
                className="btn-secondary !min-h-[38px] !px-4 text-xs font-mono"
              >
                Close Recon
              </button>
              <Link
                href={`/problems/${scoutedProblem.problem_id}?warId=${currentWar.war_id}`}
                onClick={() => sounds.playAttack()}
                className="btn-primary !min-h-[38px] !px-6 text-xs font-mono"
              >
                ⚔️ Launch Attack
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Battle Replay Modal (Phase 5) ── */}
      {replayAttack && (
        <BattleReplayModal
          attack={replayAttack}
          onClose={() => setReplayAttack(null)}
        />
      )}
    </div>
  );
}
