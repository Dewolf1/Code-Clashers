"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import StarRating from "@/components/StarRating";
import { sounds } from "@/lib/sounds";

/* ── Animated counter hook ── */
function useCountUp(target, duration = 1200, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf;
    const startTime = performance.now();
    const tick = (now) => {
      const pct = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setValue(Math.round(ease * target));
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

/* ── Stats Ticker ── */
const STATS = [
  { label: "Wars Fought",      value: 12847, suffix: "" },
  { label: "Solutions Run",    value: 284091, suffix: "" },
  { label: "Active Clans",     value: 1430, suffix: "" },
  { label: "ELO Battles Today", value: 893, suffix: "" },
];

function StatsTicker() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {STATS.map((s) => (
        <StatCard key={s.label} {...s} animate={visible} />
      ))}
    </div>
  );
}

function StatCard({ label, value, suffix, animate }) {
  const n = useCountUp(value, 1400, animate);
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value text-[var(--color-accent)] tabular-nums">
        {n.toLocaleString()}{suffix}
      </span>
    </div>
  );
}

/* ── Combat Simulator ── */
function CombatSimulator() {
  const [simulatedStars, setSimulatedStars] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLog, setSimLog] = useState("Ready for combat trial.");
  const [destruction, setDestruction] = useState(0);

  const handleSimulateAttack = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulatedStars(0);
    setDestruction(0);
    setSimLog("Infiltrating enemy base... executing solution...");
    sounds.playAttack();

    setTimeout(() => {
      setSimulatedStars(1);
      setDestruction(33);
      setSimLog("First test cluster cleared (33% destruction)");
      sounds.playStar(1);
      setTimeout(() => {
        setSimulatedStars(2);
        setDestruction(66);
        setSimLog("100% test cases passed — speed optimization running...");
        sounds.playStar(2);
        setTimeout(() => {
          setSimulatedStars(3);
          setDestruction(100);
          setSimLog("PERFECT 3-STAR! Base captured in 18ms");
          sounds.playStar(3);
          sounds.playFanfare();
          setIsSimulating(false);
        }, 700);
      }, 700);
    }, 700);
  };

  return (
    <div className="surface-panel p-6 sm:p-8 border border-[var(--color-rule-2)] space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-4">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-[var(--color-accent)] font-semibold">
            Interactive Combat Simulator
          </span>
          <h2 className="text-2xl font-display text-[var(--color-ink)] mt-0.5">
            TEST THE 3-STAR SCORING ENGINE
          </h2>
        </div>
        <button
          type="button"
          disabled={isSimulating}
          onClick={handleSimulateAttack}
          className="btn-primary !min-h-[40px] !px-6 text-sm font-mono font-bold"
        >
          {isSimulating ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Simulating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Simulate Attack
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Target info */}
        <div className="space-y-1">
          <span className="text-xs font-mono text-[var(--color-muted)]">Target Defense</span>
          <p className="font-bold text-[var(--color-ink)] text-sm">
            Fortress #3: Dynamic Programming Vault
          </p>
          <p className="text-xs font-mono text-[var(--color-muted)]">
            2000ms limit | 256MB RAM
          </p>
          {/* Destruction bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-muted)] mb-1">
              <span>Destruction</span>
              <span className="text-[var(--color-accent)] font-bold">{destruction}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${destruction}%` }} />
            </div>
          </div>
        </div>

        {/* Stars */}
        <div className="flex flex-col items-center justify-center p-5 bg-[var(--color-paper-3)] rounded-lg border border-[var(--color-rule-2)] space-y-3">
          <span className="text-xs font-mono uppercase text-[var(--color-muted)] font-semibold">
            Attack Rating
          </span>
          <StarRating stars={simulatedStars} size={36} />
          <span className="text-sm font-mono text-[var(--color-accent)] font-bold tabular-nums">
            {simulatedStars} / 3 Stars
          </span>
        </div>

        {/* Battle log */}
        <div className="font-mono text-xs p-4 bg-[var(--color-paper)] rounded-lg border border-[var(--color-rule)] space-y-2 min-h-[80px]">
          <span className="text-[10px] text-[var(--color-muted)] uppercase block font-bold">
            Battle Telemetry
          </span>
          <div className="flex items-start gap-2">
            <span className="text-[var(--color-accent)] font-bold shrink-0 mt-0.5">›</span>
            <p className="text-[var(--color-ink-2)] leading-relaxed">{simLog}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── War Cycle Phase ── */
function Phase({ num, title, description, children, accent = false }) {
  return (
    <div className={`surface-panel p-6 space-y-4 ${accent ? "border-t-2 border-t-[var(--color-accent)]" : ""}`}>
      <div
        className={`w-12 h-12 rounded flex items-center justify-center font-display text-2xl font-extrabold ${
          accent
            ? "bg-[var(--color-accent-soft)] border border-[var(--color-accent)] text-[var(--color-accent)]"
            : "bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] text-[var(--color-ink-2)]"
        }`}
      >
        {num}
      </div>
      <h3 className="text-xl font-display text-[var(--color-ink)]">{title}</h3>
      <p className="text-sm text-[var(--color-muted)] leading-relaxed">{description}</p>
      {children}
    </div>
  );
}

/* ── Feature Card (Gamified Metallurgy) ── */
function FeatureCard({ icon, title, description, borderColor = "var(--color-accent)", delay = 0 }) {
  return (
    <div
      className="card-gamified p-6 space-y-3 border-l-3 animate-fade-in relative overflow-hidden"
      style={{ borderLeftColor: borderColor, animationDelay: `${delay}ms` }}
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] flex items-center justify-center shadow-sm" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-base font-display text-[var(--color-ink)] uppercase tracking-wide">{title}</h3>
      <p className="text-xs text-[var(--color-muted)] leading-relaxed font-body">{description}</p>
    </div>
  );
}

const FEATURES = [
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    title: "CUSTOM DEFENSE HURDLE BUILDER",
    description: "On Preparation Day, clans design custom trap test cases — maximum recursion depth, edge numbers, extreme memory bounds — to intentionally break attacker submissions.",
    borderColor: "var(--color-accent)",
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-cool)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    title: "AI KEYSTROKE & LLM CHEAT DETECTION",
    description: "Real-time keystroke dynamics tracking (burstiness, inter-key delay variance) and token entropy analysis to flag direct ChatGPT/Copilot copy-pastes during live Clan Wars.",
    borderColor: "var(--color-cool)",
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    title: "LIVE WAR SPECTATOR & REPLAYS",
    description: "Watch teammates code live with low-latency WebSocket diff streaming, cheer via clan chat reactions, or replay previous attacks to review solutions.",
    borderColor: "var(--color-ok)",
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    title: "CLAN CASTLE SPELLS & PERKS",
    description: "Tactical team perks: Time Warp (+30s buffer), Recon Spell (reveals 1 hidden test case), or Shield (protects a base from 1 attack). Unlock via clan level.",
    borderColor: "var(--color-warn)",
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
    title: "CLAN WAR LEAGUES (CWL)",
    description: "7-day round-robin league tournaments against 7 rival clans with promotion/relegation tiers (Bronze → Silver → Gold → Crystal → Master → Champion).",
    borderColor: "var(--color-accent)",
  },
  {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-cool)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    title: "COMPUTATIONAL COMPLEXITY PROFILER",
    description: "Auto Big-O curve estimation: plots time/memory across N values, generating diagnostic charts for college demonstrations and peer code review.",
    borderColor: "var(--color-cool)",
  },
];

/* ── Main page ── */
export default function Home() {
  return (
    <div className="space-y-24 py-12 sm:py-16">

      {/* ── Hero ── */}
      <section className="arena-container">
        {/* Live indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-paper-2)] border border-[var(--color-rule-2)] text-xs font-mono mb-8">
          <span className="w-2 h-2 rounded-full bg-[var(--color-ok)] animate-ping" />
          <span className="text-[var(--color-ink)] font-bold">WAR SEASON 1 IS LIVE</span>
          <span className="text-[var(--color-muted)]">| 5v5 & 10v10 Queues Open</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: copy */}
          <div className="space-y-6 max-w-xl">
            <h1 className="text-5xl sm:text-7xl font-display uppercase tracking-tight text-[var(--color-ink)] leading-[0.92]">
              YOUR CLAN{" "}
              <span className="text-[var(--color-accent)] drop-shadow-[0_0_24px_oklch(74%_0.22_45_/_0.55)]">
                NEEDS YOU.
              </span>
              <br />
              SOLVE FAST.
              <br />
              <span className="text-[var(--tier-gold)] drop-shadow-[0_0_20px_oklch(88%_0.21_85_/_0.45)]">
                TAKE STARS.
              </span>
            </h1>

            <p className="text-lg text-[var(--color-muted)] font-body leading-relaxed">
              Translate algorithmic mastery into battlefield domination. Build unbreakable
              code defenses during Preparation Day, execute real-time combat attacks during
              Battle Day, and lead your clan to the top of the global ELO ladder.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/clans"
                onClick={() => sounds.playClick()}
                className="btn-primary text-base !px-8"
              >
                <svg className="mr-2" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                Mobilize Your Clan
              </Link>
              <Link
                href="/problems"
                onClick={() => sounds.playClick()}
                className="btn-secondary text-base !px-8"
              >
                Explore Challenges
              </Link>
            </div>
          </div>

          {/* Right: Stats ticker */}
          <div className="space-y-3">
            <span className="text-xs font-mono text-[var(--color-muted)] uppercase font-bold tracking-wider">
              Global Arena Stats
            </span>
            <StatsTicker />
          </div>
        </div>

        {/* Combat simulator widget */}
        <div className="mt-12">
          <CombatSimulator />
        </div>
      </section>

      {/* ── War Cycle Mechanics ── */}
      <section className="arena-container space-y-10">
        <div className="border-t border-[var(--color-rule-2)] pt-12">
          <span className="text-xs font-mono text-[var(--color-accent)] font-semibold uppercase tracking-wider">
            Battle Mechanics
          </span>
          <h2 className="text-3xl sm:text-5xl font-display text-[var(--color-ink)] mt-1">
            HOW A CLAN WAR RUNS
          </h2>
          <p className="text-sm text-[var(--color-muted)] mt-2 max-w-lg font-body">
            Every war follows a two-phase cycle inspired by Clash of Clans — strategy before execution, precision under pressure.
          </p>
        </div>

        {/* Step connector grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Connector line (visible md+) */}
          <div className="hidden md:block absolute top-[30px] left-[16.5%] right-[16.5%] h-px bg-[var(--color-rule-2)] pointer-events-none" aria-hidden="true" />

          <Phase
            num="01"
            title="PREPARATION DAY"
            description="Clans match by ELO rating. Leaders and elders fortify each defense slot by selecting and assigning algorithmic hurdles that attackers must solve under pressure."
          />
          <Phase
            num="02"
            title="BATTLE DAY"
            description="Every warrior receives two tactical attacks. Scout opposing bases, write optimized algorithms, and execute submissions to claim 1, 2, or 3 stars per base."
            accent
          >
            <div className="pt-2"><StarRating stars={3} size={20} /></div>
          </Phase>
          <Phase
            num="03"
            title="GLORY & ELO"
            description="Only the highest star count and best destruction on each base counts. When the timer expires, the winning clan claims trophies, ELO spikes, and war win streaks."
          />
        </div>
      </section>

      {/* ── Recommended Features ── */}
      <section className="arena-container space-y-10">
        <div className="border-t border-[var(--color-rule-2)] pt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-[var(--color-accent)] font-semibold uppercase tracking-wider">
              System Roadmap & Evaluation Highlights
            </span>
            <h2 className="text-3xl sm:text-5xl font-display text-[var(--color-ink)] mt-1">
              PLANNED FEATURES
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--color-muted)] bg-[var(--color-paper-3)] px-3 py-1.5 rounded border border-[var(--color-rule)] shrink-0">
            College Project Evaluation Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 60} />
          ))}
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="arena-container">
        <div className="surface-panel p-8 sm:p-12 border border-[var(--color-rule-2)] border-t-2 border-t-[var(--color-accent)] text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-display text-[var(--color-ink)]">
            READY TO CONQUER?
          </h2>
          <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto font-body leading-relaxed">
            Join the arena. Challenge rivals. Earn stars. Build your legacy on the global ELO ladder.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/clans"
              onClick={() => sounds.playClick()}
              className="btn-primary text-base !px-10 animate-glow-pulse"
            >
              Join a Clan
            </Link>
            <Link
              href="/wars/demo_war"
              onClick={() => sounds.playClick()}
              className="btn-secondary text-base !px-10"
            >
              Watch a Live War
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
