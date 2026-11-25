"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SoundToggle from "./SoundToggle";
import { sounds } from "@/lib/sounds";
import { useUser } from "@/context/UserContext";

const NAV_LINKS = [
  { label: "War Room", href: "/wars" },
  { label: "War History", href: "/wars/history" },
  { label: "Challenges", href: "/problems" },
  { label: "Clans", href: "/clans" },
  { label: "Leaderboard", href: "/leaderboard" },
];

function NavLinks({ onNavigate }) {
  const pathname = usePathname();
  return (
    <>
      {NAV_LINKS.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => { sounds.playClick(); onNavigate?.(); }}
            className={`text-xs font-mono font-bold uppercase tracking-wider px-3 py-1.5 rounded-md transition-all ${
              isActive
                ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]/40 shadow-[0_0_12px_rgba(255,122,0,0.2)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

function EloBadge() {
  const { uid, elo, tier } = useUser();
  return (
    <Link
      href={`/profile/${uid}`}
      onClick={() => sounds.playClick()}
      className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[var(--color-paper-2)] border border-[var(--tier-gold)]/40 rounded-lg font-mono text-xs hover:border-[var(--tier-gold)] shadow-[0_0_10px_oklch(88%_0.21_85_/_0.15)] transition-all"
    >
      <span style={{ color: tier.color }} className="font-bold">{tier.icon} {tier.label.toUpperCase()}</span>
      <span className="text-[var(--color-ink)] font-bold tabular-nums">{elo}</span>
      <span className="text-[var(--color-muted)] text-[10px]">ELO</span>
    </Link>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full border-b border-[var(--color-rule)] bg-[var(--color-paper)]/90 backdrop-blur-md sticky top-0 z-[var(--z-sticky-nav)]">
      <div className="arena-container flex items-center justify-between h-16">

        {/* Brand Logo */}
        <Link
          href="/"
          onClick={() => sounds.playClick()}
          className="flex items-center gap-3 group focus-visible:outline-none"
        >
          <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-display font-extrabold text-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,122,0,0.4)] group-hover:scale-105 transition-transform">
            ⚔
          </div>
          <span className="font-display text-2xl tracking-tight uppercase text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors">
            Clash of Codes
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
          <Suspense fallback={<div className="hidden md:flex items-center gap-6" />}>
            <NavLinks />
          </Suspense>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <SoundToggle />

          {/* Dynamic ELO Badge — reads from UserContext */}
          <Suspense fallback={null}>
            <EloBadge />
          </Suspense>

          <Link
            href="/clans"
            onClick={() => sounds.playClick()}
            className="btn-primary !min-h-[38px] !px-4 text-sm"
          >
            Find War
          </Link>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-[var(--color-paper-2)] transition-colors"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className={`block w-5 h-0.5 bg-[var(--color-ink)] transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[var(--color-ink)] transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[var(--color-ink)] transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <nav
          className="md:hidden border-t border-[var(--color-rule)] bg-[var(--color-paper)]/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-2 animate-fade-in"
          aria-label="Mobile Navigation"
        >
          <Suspense fallback={null}>
            <NavLinks onNavigate={() => setMenuOpen(false)} />
          </Suspense>
        </nav>
      )}
    </header>
  );
}
