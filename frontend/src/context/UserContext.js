"use client";

/**
 * UserContext — Dynamic authenticated warrior identity.
 * In DEBUG mode: reads coc_auth_token from localStorage (default: "dev_warrior_01").
 * Provides ELO, rank tier, uid, and refreshUser() across all components.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const UserContext = createContext(null);

function computeTier(elo) {
  if (elo >= 1650) return { label: "Champion", badge: "badge-tier-champion", color: "var(--tier-champion)", icon: "👑" };
  if (elo >= 1550) return { label: "Diamond", badge: "badge-tier-diamond", color: "var(--tier-diamond)", icon: "💎" };
  if (elo >= 1450) return { label: "Platinum", badge: "badge-tier-platinum", color: "var(--tier-platinum)", icon: "⚡" };
  if (elo >= 1350) return { label: "Gold", badge: "badge-tier-gold", color: "var(--tier-gold)", icon: "🥇" };
  if (elo >= 1200) return { label: "Silver", badge: "badge-tier-silver", color: "var(--tier-silver)", icon: "🥈" };
  return { label: "Bronze", badge: "badge-tier-bronze", color: "var(--tier-bronze)", icon: "🥉" };
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [elo, setElo] = useState(1200);
  const [loading, setLoading] = useState(true);

  const getUid = () => {
    if (typeof window === "undefined") return "dev_warrior_01";
    return localStorage.getItem("coc_auth_token") || "dev_warrior_01";
  };

  const refreshUser = useCallback(async () => {
    const uid = getUid();
    try {
      const data = await api.getUserEloHistory(uid);
      setElo(data?.current_elo || 1200);
      setUser({ uid, ...data });
    } catch {
      // Fallback to safe defaults if backend unreachable
      setUser({ uid });
      setElo(1200);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const uid = user?.uid || getUid();
  const tier = computeTier(elo);

  return (
    <UserContext.Provider value={{ user, uid, elo, tier, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}

