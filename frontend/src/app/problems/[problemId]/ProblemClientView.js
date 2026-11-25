"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CodeEditor from "@/components/CodeEditor";
import { api } from "@/lib/api";

const FALLBACK_DETAIL = {
  problem_id: "prob_two_sum",
  title: "Two Sum Arena",
  description:
    "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nInput format: line 1 has comma-separated integers, line 2 has the target integer.",
  difficulty: "easy",
  category: "Arrays & Hashing",
  constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.",
  examples: [
    { input: "2,7,11,15\n9", output: "0,1", explanation: "nums[0] + nums[1] == 9" },
    { input: "3,2,4\n6", output: "1,2", explanation: "nums[1] + nums[2] == 6" },
  ],
  time_limit_ms: 2000,
  memory_limit_kb: 262144,
};

function DifficultyBadge({ difficulty }) {
  const cls = {
    easy: "badge-easy",
    medium: "badge-medium",
    hard: "badge-hard",
  }[difficulty] || "badge-medium";
  return (
    <span className={`px-2.5 py-0.5 rounded text-xs uppercase font-mono font-bold ${cls}`}>
      {difficulty}
    </span>
  );
}

function OfflineBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-warn-soft)] border border-[var(--color-warn)] rounded-lg text-xs font-mono font-bold text-[var(--color-warn)] animate-slide-down">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span>Backend offline — running in demo evaluation mode. Start the FastAPI server for real Judge0 execution.</span>
    </div>
  );
}

/** Deterministic demo evaluation based on code quality signals */
function demoEvaluate(code, _language, examples) {
  const lower = code.toLowerCase();
  const lines = lower.trim().split("\n").filter(Boolean);
  const hasLogic = /for |while |\.map\(|\.filter\(|dict|hashmap|\{/.test(lower);
  const hasReturn = lower.includes("return") || lower.includes("console.log(") || lower.includes("print(");
  const trivial = lines.length < 5 && !hasReturn;

  if (trivial) {
    return {
      status: "wrong_answer",
      stars_earned: 0,
      destruction_pct: 0,
      total_time_ms: 4,
      demo_mode: true,
      test_results: examples.map((_, i) => ({
        test_case_index: i,
        passed: false,
        time_ms: 2 + i * 2,
        actual_output: "(empty — no output produced)",
      })),
    };
  }

  if (hasLogic && hasReturn && code.length > 80) {
    return {
      status: "accepted",
      stars_earned: 3,
      destruction_pct: 100,
      total_time_ms: 18,
      demo_mode: true,
      test_results: examples.map((_, i) => ({
        test_case_index: i,
        passed: true,
        time_ms: 12 + i * 3,
      })),
    };
  }

  if (hasReturn) {
    return {
      status: "wrong_answer",
      stars_earned: 1,
      destruction_pct: 45,
      total_time_ms: 24,
      demo_mode: true,
      test_results: examples.map((_, i) => ({
        test_case_index: i,
        passed: i === 0,
        time_ms: 16 + i * 4,
        actual_output: i === 0 ? "correct" : "(wrong output)",
      })),
    };
  }

  return {
    status: "wrong_answer",
    stars_earned: 0,
    destruction_pct: 20,
    total_time_ms: 8,
    demo_mode: true,
    test_results: examples.map((_, i) => ({
      test_case_index: i,
      passed: false,
      time_ms: 6 + i * 3,
      actual_output: "(runtime error)",
    })),
  };
}

export default function ProblemClientView({ problemId }) {
  const searchParams = useSearchParams();
  const warId = searchParams?.get("warId") || null;

  const [problem, setProblem] = useState(FALLBACK_DETAIL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [loadingProblem, setLoadingProblem] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const data = await api.getProblem(problemId);
        if (data) setProblem(data);
        setIsOffline(false);
      } catch {
        setIsOffline(true);
      } finally {
        setLoadingProblem(false);
      }
    }
    fetchDetail();
  }, [problemId]);

  const handleSubmit = useCallback(async ({ code, language, telemetry }) => {
    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const res = await api.submitCode({
        problem_id: problemId,
        language,
        source_code: code,
        war_id: warId || null,
        telemetry: telemetry || null,
      });
      setIsOffline(false);
      setSubmissionResult(res);
    } catch {
      setIsOffline(true);
      const demo = demoEvaluate(code, language, problem.examples || []);
      setSubmissionResult(demo);
    } finally {
      setIsSubmitting(false);
    }
  }, [problemId, warId, problem.examples]);

  const diffStats = {
    easy:   { color: "var(--color-ok)",   label: "Beginner friendly" },
    medium: { color: "var(--color-warn)",  label: "Competitive tier" },
    hard:   { color: "var(--color-bad)",   label: "Expert challenge" },
  }[problem.difficulty] || { color: "var(--color-muted)", label: "" };

  return (
    <div className="space-y-5">
      {/* Offline Banner */}
      {isOffline && <OfflineBanner />}

      {/* Top breadcrumb & war context */}
      <div className="flex items-center justify-between border-b border-[var(--color-rule-2)] pb-4">
        <div className="flex items-center gap-3">
          {warId ? (
            <Link
              href={`/wars/${warId}`}
              className="group inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--color-accent)] hover:underline"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Return to War Room
            </Link>
          ) : (
            <Link
              href="/problems"
              className="group inline-flex items-center gap-1.5 text-xs font-mono text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              All Challenges
            </Link>
          )}
        </div>

        {warId && (
          <div className="px-3 py-1.5 rounded bg-[var(--color-accent-soft)] border border-[var(--color-accent)] neon-border-accent text-xs font-mono font-bold text-[var(--color-accent)] uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-ping" />
            Attack Mode Active
          </div>
        )}
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Problem statement (pinned on desktop) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto pr-1">
          {loadingProblem ? (
            <div className="surface-panel p-6 space-y-4">
              <div className="skeleton h-5 w-20 rounded" />
              <div className="skeleton h-8 w-3/4 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-5/6 rounded" />
            </div>
          ) : (
            <div className="surface-panel p-6 space-y-5 animate-fade-in">
              {/* Header row */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <DifficultyBadge difficulty={problem.difficulty} />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-[var(--color-muted)]">{problem.category}</span>
                  <span className="text-xs font-mono px-2 py-0.5 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded text-[var(--color-muted)]">
                    {problem.time_limit_ms || 2000}ms
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded text-[var(--color-muted)]">
                    {Math.round((problem.memory_limit_kb || 262144) / 1024)}MB RAM
                  </span>
                </div>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-3xl font-display text-[var(--color-ink)] leading-tight">
                  {problem.title}
                </h1>
                <p className="text-xs font-mono mt-1" style={{ color: diffStats.color }}>
                  {diffStats.label}
                </p>
              </div>

              {/* Description */}
              <div className="text-sm font-body text-[var(--color-ink-2)] whitespace-pre-line leading-relaxed border-t border-[var(--color-rule)] pt-4">
                {problem.description}
              </div>

              {/* Examples */}
              {(problem.examples || []).map((ex, i) => (
                <div key={i} className="space-y-2">
                  <span className="text-xs uppercase font-mono text-[var(--color-muted)] font-bold block">
                    Example {i + 1}
                  </span>
                  <div className="bg-[var(--color-paper-3)] rounded border border-[var(--color-rule)] overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-[var(--color-rule)]">
                      <div className="p-3">
                        <span className="text-[10px] uppercase font-mono text-[var(--color-muted)] font-bold block mb-1">Input</span>
                        <pre className="text-xs font-mono text-[var(--color-ink)] whitespace-pre-wrap">{ex.input}</pre>
                      </div>
                      <div className="p-3">
                        <span className="text-[10px] uppercase font-mono text-[var(--color-muted)] font-bold block mb-1">Output</span>
                        <pre className="text-xs font-mono text-[var(--color-accent)] whitespace-pre-wrap">{ex.output}</pre>
                      </div>
                    </div>
                    {ex.explanation && (
                      <div className="px-3 py-2 border-t border-[var(--color-rule)] text-xs font-body text-[var(--color-muted)]">
                        <span className="font-bold text-[var(--color-ink-2)]">Explanation: </span>
                        {ex.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Constraints */}
              {problem.constraints && (
                <div className="pt-2 border-t border-[var(--color-rule)]">
                  <span className="text-xs uppercase font-mono text-[var(--color-muted)] font-bold block mb-2">
                    Constraints
                  </span>
                  <pre className="text-xs font-mono bg-[var(--color-paper)] p-3 rounded border border-[var(--color-rule)] text-[var(--color-ink-2)] whitespace-pre-wrap leading-relaxed">
                    {problem.constraints}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Code editor */}
        <div className="lg:col-span-7">
          <CodeEditor
            problem={problem}
            warId={warId}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submissionResult={submissionResult}
          />
        </div>
      </div>
    </div>
  );
}
