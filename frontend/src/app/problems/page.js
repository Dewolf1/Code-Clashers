"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { sounds } from "@/lib/sounds";

const FALLBACK_PROBLEMS = [
  { problem_id: "prob_two_sum",          title: "Two Sum Arena",             difficulty: "easy",   category: "Arrays & Hashing",      tags: ["Array", "Hash Table"],            acceptanceRate: 78 },
  { problem_id: "prob_valid_palindrome", title: "Palindrome Fortress",       difficulty: "easy",   category: "Two Pointers",           tags: ["String", "Two Pointers"],         acceptanceRate: 71 },
  { problem_id: "prob_longest_substring",title: "Unbroken Sequence Tower",  difficulty: "medium", category: "Sliding Window",         tags: ["Hash Table", "Sliding Window"],   acceptanceRate: 54 },
  { problem_id: "prob_max_subarray",     title: "Clan Siege: Maximum Power", difficulty: "medium", category: "Dynamic Programming",   tags: ["Array", "Dynamic Programming"],   acceptanceRate: 62 },
  { problem_id: "prob_binary_search",    title: "Phantom Target Search",     difficulty: "easy",   category: "Binary Search",          tags: ["Array", "Binary Search"],         acceptanceRate: 68 },
  { problem_id: "prob_graph_bfs",        title: "Siege Network Traversal",   difficulty: "hard",   category: "Graph Traversal",        tags: ["BFS", "Graph"],                   acceptanceRate: 38 },
];

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };
const DIFF_LABELS = {
  easy:   { color: "var(--color-ok)",   label: "Easy",   badge: "badge-easy" },
  medium: { color: "var(--color-warn)", label: "Medium", badge: "badge-medium" },
  hard:   { color: "var(--color-bad)",  label: "Hard",   badge: "badge-hard" },
};

/** Read solved problems from localStorage */
function getSolvedSet() {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem("coc_solved") || "[]"));
  } catch { return new Set(); }
}

/** Mark a problem as solved in localStorage */
function markSolved(problemId) {
  if (typeof window === "undefined") return;
  try {
    const solved = getSolvedSet();
    solved.add(problemId);
    localStorage.setItem("coc_solved", JSON.stringify([...solved]));
  } catch {}
}

function DiffStatsBar({ problems }) {
  const counts = problems.reduce(
    (acc, p) => { acc[p.difficulty] = (acc[p.difficulty] || 0) + 1; return acc; },
    {}
  );
  const total = problems.length || 1;

  return (
    <div className="surface-panel p-4 space-y-3">
      <span className="text-xs font-mono text-[var(--color-muted)] uppercase font-bold">Problem Distribution</span>
      <div className="space-y-2">
        {["easy", "medium", "hard"].map((diff) => {
          const count = counts[diff] || 0;
          const pct = Math.round((count / total) * 100);
          const d = DIFF_LABELS[diff];
          return (
            <div key={diff} className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold w-14 shrink-0" style={{ color: d.color }}>
                {d.label}
              </span>
              <div className="flex-1 progress-bar">
                <div
                  className="progress-bar__fill"
                  style={{ width: `${pct}%`, background: d.color }}
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-[var(--color-muted)] w-10 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SolveStatusDot({ solved }) {
  return solved ? (
    <div
      className="w-5 h-5 rounded-full bg-[var(--color-ok)] flex items-center justify-center shrink-0"
      title="Solved"
      aria-label="Solved"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
  ) : (
    <div
      className="w-5 h-5 rounded-full border-2 border-[var(--color-rule-2)] shrink-0"
      title="Unsolved"
      aria-label="Not solved yet"
    />
  );
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState(FALLBACK_PROBLEMS);
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [solved, setSolved] = useState(new Set());

  useEffect(() => {
    setSolved(getSolvedSet());
  }, []);

  useEffect(() => {
    async function fetchProblems() {
      try {
        const diff = selectedDifficulty === "all" ? null : selectedDifficulty;
        const data = await api.listProblems(diff);
        if (data && data.length > 0) setProblems(data);
      } catch {
        // Use fallback
      } finally {
        setLoading(false);
      }
    }
    fetchProblems();
  }, [selectedDifficulty]);

  const filtered = useMemo(() => {
    let out = problems;
    if (selectedDifficulty !== "all") {
      out = out.filter((p) => p.difficulty === selectedDifficulty);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return [...out].sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
  }, [problems, selectedDifficulty, search]);

  const solvedCount = problems.filter((p) => solved.has(p.problem_id)).length;

  return (
    <div className="arena-container py-12 space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--color-rule-2)] pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-[var(--color-accent)] font-semibold">
              Combat Drills
            </span>
            <h1 className="text-4xl sm:text-5xl font-display text-[var(--color-ink)] uppercase mt-1">
              Algorithmic Challenges
            </h1>
          </div>

          {/* Solve progress */}
          <div className="stat-card min-w-[140px]">
            <span className="stat-card__label">Solved</span>
            <span className="stat-card__value text-[var(--color-ok)]">
              {solvedCount}
              <span className="text-xl text-[var(--color-muted)] font-body font-normal">/{problems.length}</span>
            </span>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none"
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              placeholder="Search by title, category, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--color-paper-2)] border border-[var(--color-rule-2)] rounded pl-9 pr-3 py-2 text-sm font-mono text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-focus)] transition-colors"
            />
          </div>

          {/* Difficulty filter */}
          <div className="inline-flex rounded border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-1 text-xs font-mono">
            {["all", "easy", "medium", "hard"].map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => { sounds.playClick(); setSelectedDifficulty(diff); }}
                className={`px-3 py-1.5 font-bold uppercase rounded transition-colors ${
                  selectedDifficulty === diff
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column layout on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar stats */}
        <div className="lg:col-span-1 space-y-4">
          <DiffStatsBar problems={problems} />

          {/* Quick links */}
          <div className="surface-panel p-4 space-y-2">
            <span className="text-xs font-mono text-[var(--color-muted)] uppercase font-bold block mb-3">
              Quick Links
            </span>
            {[
              { href: "/wars/demo_war", label: "Try a Demo War", icon: "⚔" },
              { href: "/leaderboard",   label: "Clan Leaderboard", icon: "🏆" },
              { href: "/clans",         label: "Clan HQ", icon: "🛡" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => sounds.playClick()}
                className="flex items-center gap-2 text-sm font-body text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors py-1"
              >
                <span className="text-base" aria-hidden="true">{l.icon}</span>
                {l.label}
                <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Problems table */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="surface-panel p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-12 rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="surface-panel p-12 text-center">
              <p className="text-sm font-mono text-[var(--color-muted)]">
                No problems match your filter.
              </p>
            </div>
          ) : (
            <div className="surface-panel overflow-hidden">
              <table className="table-sheet font-body">
                <thead>
                  <tr>
                    <th className="w-8" aria-label="Solved status" />
                    <th className="w-10">#</th>
                    <th>Problem</th>
                    <th className="hidden sm:table-cell">Difficulty</th>
                    <th className="hidden md:table-cell text-right">Acceptance</th>
                    <th className="text-right">Solve</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((prob, idx) => {
                    const isSolved = solved.has(prob.problem_id);
                    const d = DIFF_LABELS[prob.difficulty] || DIFF_LABELS.medium;
                    return (
                      <tr key={prob.problem_id} className="transition-colors">
                        <td>
                          <SolveStatusDot solved={isSolved} />
                        </td>
                        <td className="font-mono text-xs text-[var(--color-muted)] tabular-nums">
                          {idx + 1}
                        </td>
                        <td>
                          <Link
                            href={`/problems/${prob.problem_id}`}
                            onClick={() => sounds.playClick()}
                            className={`font-bold transition-colors ${
                              isSolved
                                ? "text-[var(--color-ok)] hover:text-[var(--color-ok)]"
                                : "text-[var(--color-ink)] hover:text-[var(--color-accent)]"
                            }`}
                          >
                            {prob.title}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {(prob.tags || []).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-paper-3)] text-[var(--color-muted)] border border-[var(--color-rule)]"
                              >
                                {tag}
                              </span>
                            ))}
                            <span className="text-[10px] font-mono text-[var(--color-muted)]">
                              {prob.category}
                            </span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <span className={`inline-block px-2.5 py-0.5 rounded font-mono text-xs uppercase font-bold ${d.badge}`}>
                            {prob.difficulty}
                          </span>
                        </td>
                        <td className="text-right font-mono text-xs hidden md:table-cell tabular-nums">
                          <span className="text-[var(--color-muted)]">
                            {prob.acceptanceRate || "--"}%
                          </span>
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/problems/${prob.problem_id}`}
                            onClick={() => sounds.playClick()}
                            className={`inline-flex items-center gap-1 text-xs font-mono font-bold transition-colors ${
                              isSolved
                                ? "text-[var(--color-ok)] hover:underline"
                                : "text-[var(--color-accent)] hover:underline"
                            }`}
                          >
                            {isSolved ? "Review" : "Solve"}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
