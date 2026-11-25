"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import StarRating from "./StarRating";
import AttackCelebrationModal from "./AttackCelebrationModal";
import { api } from "@/lib/api";
import { sounds } from "@/lib/sounds";

const PROBLEM_STARTERS = {
  prob_two_sum: {
    python: `# Two Sum Arena — Find indices of two numbers that add up to target
import sys

def solve():
    # Read all lines from standard input
    lines = sys.stdin.read().strip().split('\\n')
    if len(lines) < 2:
        return
    
    # Line 1: comma-separated numbers (e.g. "2,7,11,15")
    nums = [int(x.strip()) for x in lines[0].split(',') if x.strip()]
    # Line 2: target integer (e.g. "9")
    target = int(lines[1].strip())
    
    # TODO: Write your algorithm here to find two indices i, j such that nums[i] + nums[j] == target
    # Output format: print comma-separated indices, e.g. print(f"{i},{j}")
    pass

if __name__ == "__main__":
    solve()
`,
    javascript: `// Two Sum Arena — JavaScript (Node.js)
const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
    if (input.length < 2) return;
    
    const nums = input[0].split(',').map(x => parseInt(x.trim(), 10));
    const target = parseInt(input[1].trim(), 10);
    
    // TODO: Write your algorithm here to find two indices i, j such that nums[i] + nums[j] === target
    // Output format: console.log(\`\${i},\${j}\`);
}

solve();
`,
    cpp: `// Two Sum Arena — C++ (GCC 17)
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    string line1, line2;
    if (!getline(cin, line1) || !getline(cin, line2)) return 0;
    
    stringstream ss(line1);
    string token;
    vector<int> nums;
    while (getline(ss, token, ',')) {
        nums.push_back(stoi(token));
    }
    int target = stoi(line2);
    
    // TODO: Write your algorithm here to find two indices i, j such that nums[i] + nums[j] == target
    // Output format: cout << i << "," << j << "\\n";
    
    return 0;
}
`,
  },
  prob_valid_palindrome: {
    python: `# Palindrome Fortress — Verify alphanumeric palindrome
import sys

def solve():
    raw = sys.stdin.read().strip()
    
    # TODO: Return "true" if the phrase is a palindrome after converting to lowercase
    # and removing non-alphanumeric characters; otherwise print "false"
    pass

if __name__ == "__main__":
    solve()
`,
    javascript: `const fs = require('fs');
const s = fs.readFileSync(0, 'utf-8').trim();

// TODO: Return "true" if palindrome after filtering non-alphanumeric, else "false"
`,
    cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    
    // TODO: Return "true" if palindrome after filtering non-alphanumeric, else "false"
    
    return 0;
}
`,
  },
};

const GENERIC_STARTERS = {
  python: `# Write your solution here
import sys

def solve():
    lines = sys.stdin.read().strip().split('\\n')
    if not lines or not lines[0]:
        return
    # TODO: implement your logic
    print("solution")

if __name__ == "__main__":
    solve()
`,
  javascript: `// JavaScript (Node.js) Solution
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');

function solve() {
    // TODO: implement logic
    console.log("solution");
}

solve();
`,
  cpp: `// C++ Solution
#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // TODO: implement logic
    return 0;
}
`,
  java: `// Java Solution
import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        System.out.println("solution");
    }
}
`,
};

function getStarterCode(problemId, lang) {
  if (problemId && PROBLEM_STARTERS[problemId] && PROBLEM_STARTERS[problemId][lang]) {
    return PROBLEM_STARTERS[problemId][lang];
  }
  return GENERIC_STARTERS[lang] || GENERIC_STARTERS.python;
}

const LANG_LABELS = {
  python: "Python 3",
  javascript: "JavaScript (Node.js)",
  cpp: "C++ (GCC 17)",
  java: "Java 21",
};

function RadarLoader({ label = "Compiling & executing solution..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--color-rule-2)]" />
        <div className="absolute inset-1 rounded-full border-2 border-t-[var(--color-accent)] border-r-[var(--color-accent)] border-b-transparent border-l-transparent animate-radar" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
        </div>
      </div>
      <span className="text-xs font-mono text-[var(--color-accent)] font-bold uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function StatusBar({ language, code, isSubmitting }) {
  const lines = code ? code.split("\n").length : 0;
  const chars = code ? code.length : 0;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-paper-2)] border-t border-[var(--color-rule)] text-[10px] font-mono text-[var(--color-muted)]">
      <div className="flex items-center gap-4">
        <span>{LANG_LABELS[language] || language}</span>
        <span>{lines} lines</span>
        <span>{chars} chars</span>
      </div>
      <div className="flex items-center gap-2">
        {isSubmitting ? (
          <span className="text-[var(--color-accent)] font-bold animate-pulse">Compiling...</span>
        ) : (
          <span className="text-[var(--color-ok)]">● Ready</span>
        )}
        <span className="hidden sm:inline text-[var(--color-muted)]">⌘ + Enter to execute</span>
      </div>
    </div>
  );
}

function ComplexityChart({
  benchmarks = [],
  baselineQuadratic = [],
  baselineLinear = [],
  estimatedComplexity = "",
}) {
  const valid = benchmarks.filter((b) => b.time_ms >= 0);
  if (valid.length === 0) return null;

  const width = 520;
  const height = 200;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 35;

  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const allTimes = [
    ...valid.map((b) => b.time_ms),
    ...baselineQuadratic.map((b) => b.time_ms || 0),
  ];
  const maxTime = Math.max(...allTimes, 1) * 1.15;
  const minN = valid[0].n;
  const maxN = valid[valid.length - 1].n;

  const getX = (n) => padLeft + ((n - minN) / (maxN - minN || 1)) * innerW;
  const getY = (t) => padTop + innerH - (Math.max(0, t) / maxTime) * innerH;

  const points = valid.map((b) => ({
    x: getX(b.n),
    y: getY(b.time_ms),
    n: b.n,
    time: b.time_ms,
  }));

  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`;

  // Theoretical quadratic baseline curve
  const quadPoints = baselineQuadratic
    .filter((b) => b.time_ms !== undefined)
    .map((b) => ({
      x: getX(b.n),
      y: getY(b.time_ms),
    }));
  const quadD = quadPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  // Theoretical linear reference curve
  const linPoints = baselineLinear
    .filter((b) => b.time_ms !== undefined)
    .map((b) => ({
      x: getX(b.n),
      y: getY(b.time_ms),
    }));
  const linD = linPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="w-full bg-[var(--color-paper)] p-4 rounded-lg border border-[var(--color-rule-2)] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <span className="text-[var(--color-muted)] font-bold uppercase tracking-wider">
          Runtime vs Input Scaling (N = 100 → 5000)
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-accent)] font-bold">{estimatedComplexity}</span>
        </div>
      </div>

      {/* Legend Pills */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono border-y border-[var(--color-rule)] py-1.5">
        <span className="flex items-center gap-1.5 text-[var(--color-accent)] font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" /> Your Algorithm
        </span>
        {quadD && (
          <span className="flex items-center gap-1.5 text-[var(--color-bad)]">
            <span className="w-4 h-0.5 border-b-2 border-dashed border-[var(--color-bad)]" /> O(N²) Quadratic Baseline
          </span>
        )}
        {linD && (
          <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
            <span className="w-4 h-0.5 border-b-2 border-dotted border-[var(--color-muted)]" /> O(N) Linear Reference
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[240px]">
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padTop + innerH * (1 - ratio);
            const val = (maxTime * ratio).toFixed(1);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="var(--color-rule)"
                  strokeDasharray="2 3"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--color-muted)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {val}ms
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#curveGradient)" />

          {/* Theoretical Quadratic Baseline (O(N²)) — Crimson Dashed */}
          {quadD && (
            <path
              d={quadD}
              fill="none"
              stroke="var(--color-bad)"
              strokeWidth="2"
              strokeDasharray="5 4"
              opacity="0.85"
            />
          )}

          {/* Theoretical Linear Baseline (O(N)) — Muted Dotted */}
          {linD && (
            <path
              d={linD}
              fill="none"
              stroke="var(--color-muted)"
              strokeWidth="1.5"
              strokeDasharray="2 3"
              opacity="0.5"
            />
          )}

          {/* Measured Algorithm Curve — Molten Gold/Accent */}
          <path
            d={lineD}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Measured Data Points */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="var(--color-paper)"
                stroke="var(--color-accent)"
                strokeWidth="2.5"
              />
              <text
                x={p.x}
                y={p.y - 7}
                textAnchor="middle"
                fill="var(--color-ink)"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {p.time}ms
              </text>
              <text
                x={p.x}
                y={padTop + innerH + 16}
                textAnchor="middle"
                fill="var(--color-muted)"
                fontSize="9"
                fontFamily="monospace"
              >
                N={p.n}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}


export default function CodeEditor({
  problem,
  warId = null,
  onSubmit = null,
  isSubmitting = false,
  submissionResult = null,
}) {
  const problemId = problem?.problem_id;
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(() => getStarterCode(problemId, "python"));
  const [activeTab, setActiveTab] = useState("testcases"); // "testcases" | "results" | "custom"
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const editorRef = useRef(null);

  // Custom Input Sandbox State
  const [customInput, setCustomInput] = useState(() => (problem?.examples?.[0]?.input || "2,7,11,15\n9"));
  const [customRunResult, setCustomRunResult] = useState(null);
  const [isRunningCustom, setIsRunningCustom] = useState(false);

  // Big-O Complexity Profiler State
  const [isProfiling, setIsProfiling] = useState(false);
  const [profileResult, setProfileResult] = useState(null);

  // Keystroke dynamics tracking for AI anti-cheat telemetry
  const typingStartRef = useRef(Date.now());
  const pasteCountRef = useRef(0);
  const pasteCharsRef = useRef(0);

  useEffect(() => {
    typingStartRef.current = Date.now();
    pasteCountRef.current = 0;
    pasteCharsRef.current = 0;
  }, [problemId]);

  // Update starter code if problemId changes
  useEffect(() => {
    if (problemId) {
      setCode(getStarterCode(problemId, language));
      if (problem?.examples?.[0]?.input) {
        setCustomInput(problem.examples[0].input);
      }
    }
  }, [problemId, language]);

  // Global paste event listener for telemetry
  useEffect(() => {
    const handlePaste = (e) => {
      const text = e.clipboardData?.getData("text") || "";
      pasteCountRef.current += 1;
      pasteCharsRef.current += text.length;
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + Enter to submit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmitCode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, language, isSubmitting]);

  // Audio & modal trigger when results arrive
  useEffect(() => {
    if (submissionResult) {
      setActiveTab("results");
      setSelectedCaseIdx(0);
      if (submissionResult.status === "accepted") {
        sounds.playSuccess();
        if (submissionResult.stars_earned && submissionResult.stars_earned > 0) {
          setShowCelebration(true);
        }
      } else {
        sounds.playFail();
      }
    }
  }, [submissionResult]);

  const handleLanguageChange = (newLang) => {
    sounds.playClick();
    setLanguage(newLang);
    setCode(getStarterCode(problemId, newLang));
  };

  const handleResetCode = () => {
    sounds.playClick();
    setCode(getStarterCode(problemId, language));
  };

  const handleInjectFastIO = () => {
    sounds.playClick();
    const snippets = {
      python: `import sys\ninput = sys.stdin.readline\nsys.setrecursionlimit(200000)\n\n`,
      javascript: `const lines = require('fs').readFileSync(0, 'utf-8').trim().split('\\n');\nlet ptr = 0;\nconst readline = () => lines[ptr++];\n\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n// Fast I/O enabled\n`,
      java: `import java.io.*;\nimport java.util.*;\n// Fast I/O with BufferedReader\n`,
    };
    const snippet = snippets[language] || snippets.python;
    if (!code.includes(snippet.trim())) {
      setCode(snippet + code);
    }
  };


  const handleSubmitCode = () => {
    if (isSubmitting) return;
    sounds.playAttack();
    const telemetry = {
      paste_count: pasteCountRef.current,
      paste_chars: pasteCharsRef.current,
      total_typing_ms: Math.max(1000, Date.now() - typingStartRef.current),
      total_chars: code.length,
    };
    if (onSubmit) onSubmit({ code, language, warId, telemetry });
  };

  const handleRunCustomSandbox = async () => {
    setIsRunningCustom(true);
    setCustomRunResult(null);
    sounds.playClick();

    try {
      const res = await api.customRun({
        source_code: code,
        language,
        custom_input: customInput,
        time_limit_ms: problem?.time_limit_ms || 2000,
      });
      setCustomRunResult(res);
      if (res.status === "success" && !res.error) {
        sounds.playSuccess();
      } else {
        sounds.playFail();
      }
    } catch (err) {
      setCustomRunResult({
        output: "",
        error: err.message || "Failed to execute sandbox",
        duration_ms: 0,
        status: "error",
      });
      sounds.playFail();
    } finally {
      setIsRunningCustom(false);
    }
  };

  const handleProfileComplexity = async () => {
    setIsProfiling(true);
    setProfileResult(null);
    sounds.playClick();

    try {
      const res = await api.profileCode({
        problem_id: problemId || "prob_two_sum",
        source_code: code,
        language,
      });
      setProfileResult(res);
      if (res.status === "success") {
        sounds.playSuccess();
      } else {
        sounds.playFail();
      }
    } catch (err) {
      setProfileResult({
        status: "error",
        error: err.message || "Failed to profile complexity",
        benchmarks: [],
        estimated_complexity: "Indeterminate",
      });
      sounds.playFail();
    } finally {
      setIsProfiling(false);
    }
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme("arena-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6e7681", fontStyle: "italic" },
        { token: "keyword", foreground: "e06c75" },
        { token: "string", foreground: "98c379" },
        { token: "number", foreground: "d19a66" },
        { token: "operator", foreground: "56b6c2" },
        { token: "type", foreground: "c678dd" },
      ],
      colors: {
        "editor.background": "#14131b",
        "editor.foreground": "#f2edf8",
        "editorCursor.foreground": "#ff7a00",
        "editor.lineHighlightBackground": "#1e1d2a",
        "editorLineNumber.foreground": "#484f58",
        "editorLineNumber.activeForeground": "#f2edf8",
        "editor.selectionBackground": "#ff7a0033",
        "editorBracketMatch.background": "#ff7a0022",
        "editorBracketMatch.border": "#ff7a00",
        "scrollbarSlider.background": "#ffffff15",
        "scrollbarSlider.hoverBackground": "#ffffff25",
      },
    });
    monaco.editor.setTheme("arena-dark");

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleSubmitCode();
    });
  };

  const resultStatus = submissionResult?.status;
  const isAccepted = resultStatus === "accepted";
  const isRuntimeError = resultStatus === "runtime_error";
  const isCompilationError = resultStatus === "compilation_error";
  const isTLE = resultStatus === "time_limit_exceeded";

  // Test cases list to show
  const testResults = submissionResult?.test_results || [];
  const activeTestCaseResult = testResults[selectedCaseIdx] || null;
  const activeExample = (problem?.examples || [])[selectedCaseIdx] || null;
  const integrity = submissionResult?.integrity;

  return (
    <div className="flex flex-col space-y-3">
      {/* ── Editor Controls Bar ── */}
      <div className="surface-panel p-2.5 flex flex-wrap items-center justify-between gap-3 border border-[var(--color-rule-2)] rounded-lg">
        <div className="flex items-center gap-2">
          <select
            id="lang-select"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] rounded px-3 py-1.5 text-xs font-mono font-bold text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-focus)] cursor-pointer"
          >
            {Object.entries(LANG_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleResetCode}
            title="Reset to challenge starter template"
            className="px-2.5 py-1.5 rounded text-xs font-mono text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] transition-colors border border-transparent hover:border-[var(--color-rule)]"
          >
            ↺ Reset
          </button>

          <button
            type="button"
            onClick={handleInjectFastIO}
            title="Inject competitive programming fast I/O boilerplate"
            className="px-2.5 py-1.5 rounded text-xs font-mono text-[var(--color-accent)] hover:bg-[var(--color-paper-3)] transition-colors border border-[var(--color-accent-soft)] hover:border-[var(--color-accent)] font-bold flex items-center gap-1"
          >
            ⚡ Fast I/O
          </button>
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmitCode}
          className="btn-primary !min-h-[38px] !px-6 text-xs font-mono font-bold uppercase tracking-wider"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Compiling...
            </span>
          ) : warId ? (
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              Launch Attack
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Run & Verify
            </span>
          )}
        </button>
      </div>

      {/* ── Monaco Editor Container ── */}
      <div
        className="surface-panel overflow-hidden rounded-lg border border-[var(--color-rule-2)] relative flex flex-col"
        style={{ height: "420px" }}
      >
        <div className="flex-1">
          <Editor
            height="100%"
            language={language === "cpp" ? "cpp" : language}
            value={code}
            onChange={(val) => setCode(val || "")}
            onMount={handleEditorMount}
            theme="arena-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              roundedSelection: true,
              automaticLayout: true,
              tabSize: 4,
              renderWhitespace: "selection",
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
        <StatusBar language={language} code={code} isSubmitting={isSubmitting} />
      </div>

      {/* ── Output Console / Test Cases Panel ── */}
      <div className="surface-panel p-4 space-y-4 border border-[var(--color-rule-2)] rounded-lg">
        {/* Tab Headers */}
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2.5">
          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => { sounds.playClick(); setActiveTab("testcases"); }}
              className={`pb-1.5 border-b-2 font-mono transition-colors ${
                activeTab === "testcases"
                  ? "border-[var(--color-accent)] text-[var(--color-ink)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Test Cases ({problem?.examples?.length || 2})
            </button>
            <button
              type="button"
              onClick={() => { sounds.playClick(); setActiveTab("custom"); }}
              className={`pb-1.5 border-b-2 font-mono transition-colors ${
                activeTab === "custom"
                  ? "border-[var(--color-accent)] text-[var(--color-ink)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Custom Sandbox 🧪
            </button>
            <button
              type="button"
              onClick={() => { sounds.playClick(); setActiveTab("profiler"); }}
              className={`pb-1.5 border-b-2 font-mono transition-colors ${
                activeTab === "profiler"
                  ? "border-[var(--color-accent)] text-[var(--color-ink)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Complexity Profiler 📊
            </button>
            <button
              type="button"
              onClick={() => { sounds.playClick(); setActiveTab("results"); }}
              className={`pb-1.5 border-b-2 font-mono flex items-center gap-2 transition-colors ${
                activeTab === "results"
                  ? "border-[var(--color-accent)] text-[var(--color-ink)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Execution Console
              {submissionResult && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isAccepted
                      ? "bg-[var(--color-ok-soft)] text-[var(--color-ok)]"
                      : isRuntimeError || isCompilationError
                      ? "bg-[var(--color-bad-soft)] text-[var(--color-bad)]"
                      : isTLE
                      ? "bg-[var(--color-warn-soft)] text-[var(--color-warn)]"
                      : "bg-[var(--color-bad-soft)] text-[var(--color-bad)]"
                  }`}
                >
                  {resultStatus}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {submissionResult?.demo_mode && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-warn-soft)] border border-[var(--color-warn)] text-[var(--color-warn)] uppercase font-bold">
                Demo Mode
              </span>
            )}
            {submissionResult && (
              <div className="flex items-center gap-1.5">
                <StarRating stars={submissionResult.stars_earned || 0} size={18} />
                <span className="text-xs font-mono text-[var(--color-accent)] font-bold tabular-nums">
                  {submissionResult.stars_earned || 0}/3
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: Problem Test Cases */}
        {activeTab === "testcases" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {(problem?.examples || []).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { sounds.playClick(); setSelectedCaseIdx(idx); }}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                    selectedCaseIdx === idx
                      ? "bg-[var(--color-paper-3)] border border-[var(--color-accent)] text-[var(--color-accent)]"
                      : "bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  Case {idx + 1}
                </button>
              ))}
            </div>

            {activeExample && (
              <div className="bg-[var(--color-paper-3)] rounded border border-[var(--color-rule)] p-3 space-y-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[var(--color-muted)] font-bold block mb-1">
                    Input
                  </span>
                  <pre className="text-xs font-mono bg-[var(--color-paper)] p-2.5 rounded border border-[var(--color-rule)] text-[var(--color-ink)] whitespace-pre-wrap">
                    {activeExample.input}
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[var(--color-muted)] font-bold block mb-1">
                    Expected Output
                  </span>
                  <pre className="text-xs font-mono bg-[var(--color-paper)] p-2.5 rounded border border-[var(--color-rule)] text-[var(--color-accent)] whitespace-pre-wrap">
                    {activeExample.output}
                  </pre>
                </div>
                {activeExample.explanation && (
                  <p className="text-xs text-[var(--color-muted)] pt-1 border-t border-[var(--color-rule)]">
                    <strong className="text-[var(--color-ink-2)]">Explanation: </strong>
                    {activeExample.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Custom Sandbox Runner */}
        {activeTab === "custom" && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[var(--color-muted)]">
                Provide custom input lines to test code without consuming war attacks:
              </span>
              <button
                type="button"
                disabled={isRunningCustom}
                onClick={handleRunCustomSandbox}
                className="btn-secondary !min-h-[32px] !px-4 text-xs font-mono font-bold"
              >
                {isRunningCustom ? "Running..." : "▶ Run Custom Test"}
              </button>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-[var(--color-muted)] font-bold block mb-1">
                Custom Standard Input
              </span>
              <textarea
                rows={3}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Line 1: 2,7,11,15&#10;Line 2: 9"
                className="w-full bg-[var(--color-paper)] border border-[var(--color-rule-2)] rounded p-2.5 text-xs font-mono text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-focus)]"
              />
            </div>

            {isRunningCustom ? (
              <RadarLoader label="Executing custom sandbox test..." />
            ) : customRunResult && (
              <div className="bg-[var(--color-paper-3)] rounded border border-[var(--color-rule)] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono border-b border-[var(--color-rule)] pb-1.5">
                  <span className={customRunResult.status === "success" && !customRunResult.error ? "text-[var(--color-ok)] font-bold" : "text-[var(--color-bad)] font-bold"}>
                    {customRunResult.status === "success" && !customRunResult.error ? "✓ Execution Completed" : "✗ Execution Error"}
                  </span>
                  <span className="text-[10px] text-[var(--color-muted)]">{customRunResult.duration_ms} ms</span>
                </div>

                {customRunResult.output && (
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[var(--color-ok)] font-bold block mb-1">
                      Standard Output:
                    </span>
                    <pre className="text-xs font-mono p-2.5 bg-[var(--color-paper)] rounded border border-[var(--color-rule)] text-[var(--color-ok)] whitespace-pre-wrap">
                      {customRunResult.output}
                    </pre>
                  </div>
                )}

                {customRunResult.error && (
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[var(--color-bad)] font-bold block mb-1">
                      Standard Error / Diagnostics:
                    </span>
                    <pre className="text-xs font-mono p-2.5 bg-[var(--color-paper)] rounded border border-[var(--color-bad)] text-[var(--color-ink-2)] whitespace-pre-wrap">
                      {customRunResult.error}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Big-O Complexity Profiler */}
        {activeTab === "profiler" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-[var(--color-ink)] block">
                  Empirical Big-O Asymptotic Complexity Profiler
                </span>
                <span className="text-[11px] font-mono text-[var(--color-muted)]">
                  Benchmarks scaling execution time against N ∈ [100, 500, 1000, 2500, 5000] synthetic inputs.
                </span>
              </div>
              <button
                type="button"
                disabled={isProfiling}
                onClick={handleProfileComplexity}
                className="btn-primary !min-h-[32px] !px-4 text-xs font-mono font-bold"
              >
                {isProfiling ? "Profiling Scaling Curve..." : "▶ Run Big-O Benchmark"}
              </button>
            </div>

            {isProfiling ? (
              <RadarLoader label="Benchmarking execution across scaling input dimensions (N=100 → 5000)..." />
            ) : !profileResult ? (
              <div className="p-8 text-center space-y-2 bg-[var(--color-paper-3)] rounded border border-[var(--color-rule)]">
                <span className="text-3xl block" aria-hidden="true">📊</span>
                <h4 className="text-sm font-display text-[var(--color-ink)] font-bold">
                  Asymptotic Runtime Profiling Ready
                </h4>
                <p className="text-xs font-mono text-[var(--color-muted)] max-w-md mx-auto">
                  Click &ldquo;Run Big-O Benchmark&rdquo; to execute your solution against expanding input sizes. We will fit the resulting empirical curve to detect O(1), O(N), O(N log N), or O(N²).
                </p>
              </div>
            ) : profileResult.status === "error" || profileResult.status === "compilation_error" ? (
              <div className="p-4 rounded-lg bg-[var(--color-bad-soft)] border border-[var(--color-bad)] text-xs font-mono text-[var(--color-bad)] space-y-1">
                <span className="font-bold block">✗ Profiling Failed</span>
                <p>{profileResult.error || "Execution terminated unexpectedly during benchmark."}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Result Summary Badge */}
                <div className="p-4 rounded-lg bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-[var(--color-muted)] font-bold block">
                      Estimated Algorithmic Complexity
                    </span>
                    <span className="text-xl font-display font-bold text-[var(--color-accent)]">
                      {profileResult.estimated_complexity}
                    </span>
                  </div>

                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-[var(--color-ok-soft)] text-[var(--color-ok)] border border-[var(--color-ok)]">
                    ✓ Empirical Fit Complete
                  </span>
                </div>

                {/* SVG Line Chart */}
                <ComplexityChart
                  benchmarks={profileResult.benchmarks || []}
                  baselineQuadratic={profileResult.baseline_quadratic || []}
                  baselineLinear={profileResult.baseline_linear || []}
                  estimatedComplexity={profileResult.estimated_complexity}
                />

                {/* Scaling Data Table */}
                <div className="bg-[var(--color-paper-3)] rounded border border-[var(--color-rule)] overflow-hidden">
                  <table className="w-full text-xs font-mono text-left">
                    <thead className="bg-[var(--color-paper-2)] border-b border-[var(--color-rule)] text-[10px] uppercase text-[var(--color-muted)]">
                      <tr>
                        <th className="py-2 px-3">Input Size (N)</th>
                        <th className="py-2 px-3">Elapsed Time</th>
                        <th className="py-2 px-3">Relative Growth</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-rule)]">
                      {(profileResult.benchmarks || []).map((b, idx, arr) => {
                        const baseTime = arr[0]?.time_ms || 1;
                        const growth = (b.time_ms / (baseTime || 1)).toFixed(2);
                        return (
                          <tr key={idx} className="hover:bg-[var(--color-paper-2)] transition-colors">
                            <td className="py-2 px-3 font-bold text-[var(--color-ink)]">N = {b.n.toLocaleString()}</td>
                            <td className="py-2 px-3 text-[var(--color-accent)] tabular-nums">{b.time_ms >= 0 ? `${b.time_ms} ms` : "Failed"}</td>
                            <td className="py-2 px-3 text-[var(--color-muted)] tabular-nums">{b.time_ms >= 0 ? `${growth}x` : "-"}</td>
                            <td className="py-2 px-3">
                              <span className={`text-[10px] font-bold ${b.time_ms >= 0 ? "text-[var(--color-ok)]" : "text-[var(--color-bad)]"}`}>
                                {b.time_ms >= 0 ? "PASSED" : "FAILED"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Execution Results with AI Anti-Cheat Audit */}
        {activeTab === "results" && (
          <div>
            {isSubmitting ? (
              <RadarLoader />
            ) : !submissionResult ? (
              <div className="p-8 text-center space-y-2">
                <svg className="mx-auto text-[var(--color-muted)] opacity-40" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <p className="text-sm font-mono text-[var(--color-muted)]">
                  Press <strong className="text-[var(--color-ink)]">Run & Verify</strong> or <strong className="text-[var(--color-ink)]">⌘ + Enter</strong> to test code against battlefield test cases.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Result Summary Banner */}
                <div
                  className={`p-4 rounded-lg border flex flex-wrap items-center justify-between gap-4 ${
                    isAccepted
                      ? "bg-[var(--color-ok-soft)] border-[var(--color-ok)] neon-border-ok"
                      : isRuntimeError || isCompilationError
                      ? "bg-[var(--color-bad-soft)] border-[var(--color-bad)] neon-border-bad"
                      : isTLE
                      ? "bg-[var(--color-warn-soft)] border-[var(--color-warn)]"
                      : "bg-[var(--color-bad-soft)] border-[var(--color-bad)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded text-xs font-bold uppercase font-mono ${
                        isAccepted
                          ? "bg-[var(--color-ok)] text-[var(--color-paper)]"
                          : "bg-[var(--color-bad)] text-[var(--color-paper)]"
                      }`}
                    >
                      {isAccepted
                        ? "✓ Accepted"
                        : isRuntimeError
                        ? "✗ Runtime Error"
                        : isCompilationError
                        ? "✗ Compilation Error"
                        : isTLE
                        ? "⏳ Time Limit Exceeded"
                        : "✗ Wrong Answer"}
                    </span>
                    <span className="text-xs font-mono text-[var(--color-ink-2)]">
                      {submissionResult.total_time_ms}ms runtime
                    </span>
                    {submissionResult.destruction_pct !== undefined && (
                      <span className="text-xs font-mono text-[var(--color-ink-2)]">
                        {Number(submissionResult.destruction_pct).toFixed(0)}% base destroyed
                      </span>
                    )}
                  </div>
                  <StarRating stars={submissionResult.stars_earned || 0} size={22} />
                </div>

                {/* ── AI RAG Plagiarism & Code Integrity Audit Card ── */}
                {integrity && (
                  <div className="p-4 rounded-lg bg-[var(--color-paper-3)] border border-[var(--color-rule-2)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden="true">🛡️</span>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-ink)]">
                          AI RAG Plagiarism & Integrity Audit
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          integrity.plagiarism_risk === "clean"
                            ? "bg-[var(--color-ok-soft)] text-[var(--color-ok)] border-[var(--color-ok)]"
                            : integrity.plagiarism_risk === "suspicious"
                            ? "bg-[var(--color-warn-soft)] text-[var(--color-warn)] border-[var(--color-warn)]"
                            : "bg-[var(--color-bad-soft)] text-[var(--color-bad)] border-[var(--color-bad)]"
                        }`}
                      >
                        {integrity.plagiarism_risk === "clean"
                          ? "✓ Authentic Human Code"
                          : integrity.plagiarism_risk === "suspicious"
                          ? "⚠ Suspicious Similarity"
                          : "✗ Flagged: LLM Plagiarism"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                      <div className="bg-[var(--color-paper)] p-2 rounded border border-[var(--color-rule)]">
                        <span className="text-[var(--color-muted)] block text-[10px]">Integrity Score</span>
                        <span className="font-bold text-[var(--color-accent)] text-sm tabular-nums">
                          {integrity.integrity_score}/100
                        </span>
                      </div>
                      <div className="bg-[var(--color-paper)] p-2 rounded border border-[var(--color-rule)]">
                        <span className="text-[var(--color-muted)] block text-[10px]">RAG Vector Similarity</span>
                        <span className="font-bold text-[var(--color-ink)] tabular-nums">
                          {integrity.highest_similarity_pct}%
                        </span>
                      </div>
                      <div className="bg-[var(--color-paper)] p-2 rounded border border-[var(--color-rule)]">
                        <span className="text-[var(--color-muted)] block text-[10px]">Matched Corpus</span>
                        <span className="font-bold text-[var(--color-ink)] truncate block" title={integrity.matched_source}>
                          {integrity.matched_source}
                        </span>
                      </div>
                      <div className="bg-[var(--color-paper)] p-2 rounded border border-[var(--color-rule)]">
                        <span className="text-[var(--color-muted)] block text-[10px]">Keystroke Dynamics</span>
                        <span className="font-bold text-[var(--color-ink)] truncate block" title={integrity.keystroke_status}>
                          {integrity.keystroke_status}
                        </span>
                      </div>
                    </div>

                    {integrity.detected_fingerprints?.length > 0 && (
                      <div className="text-[10px] font-mono text-[var(--color-bad)] pt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold">Detected LLM Signatures:</span>
                        {integrity.detected_fingerprints.map((fp, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--color-bad-soft)] border border-[var(--color-bad)]">
                            {fp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Case selector pills in Results */}
                {testResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {testResults.map((tr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => { sounds.playClick(); setSelectedCaseIdx(idx); }}
                          className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2 transition-colors ${
                            selectedCaseIdx === idx
                              ? "bg-[var(--color-paper-3)] border-2 border-[var(--color-accent)] text-[var(--color-ink)]"
                              : "bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                          }`}
                        >
                          <span className={tr.passed ? "text-[var(--color-ok)]" : "text-[var(--color-bad)]"}>
                            {tr.passed ? "✓" : "✗"}
                          </span>
                          <span>Case {idx + 1}</span>
                          <span className="text-[10px] text-[var(--color-muted)] font-normal">{tr.time_ms}ms</span>
                        </button>
                      ))}
                    </div>

                    {/* Detailed Inspector for active test case */}
                    {activeTestCaseResult && (
                      <div className="bg-[var(--color-paper-3)] rounded border border-[var(--color-rule)] p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono border-b border-[var(--color-rule)] pb-2">
                          <span className="font-bold text-[var(--color-ink)]">
                            Test Case #{selectedCaseIdx + 1} Details
                          </span>
                          <span className={activeTestCaseResult.passed ? "text-[var(--color-ok)] font-bold" : "text-[var(--color-bad)] font-bold"}>
                            {activeTestCaseResult.passed ? "PASSED" : "FAILED"} ({activeTestCaseResult.time_ms} ms)
                          </span>
                        </div>

                        {/* If there was an error/traceback */}
                        {activeTestCaseResult.actual_output &&
                         (activeTestCaseResult.actual_output.includes("Traceback") ||
                          activeTestCaseResult.actual_output.includes("Error") ||
                          activeTestCaseResult.actual_output.includes("Exception") ||
                          !activeTestCaseResult.passed) ? (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-mono uppercase text-[var(--color-bad)] font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[var(--color-bad)]" />
                              Program Output / Diagnostics:
                            </span>
                            <pre className="text-xs font-mono p-3 rounded bg-[var(--color-paper)] border border-[var(--color-bad)] text-[var(--color-ink-2)] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[180px]">
                              {activeTestCaseResult.actual_output || "(no output was printed)"}
                            </pre>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-mono uppercase text-[var(--color-ok)] font-bold">
                              Program Output:
                            </span>
                            <pre className="text-xs font-mono p-3 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ok)] overflow-x-auto whitespace-pre-wrap">
                              {activeTestCaseResult.actual_output || "(empty)"}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Victory Celebration Modal */}
      <AttackCelebrationModal
        isOpen={showCelebration}
        stars={submissionResult?.stars_earned || 0}
        destruction={submissionResult?.destruction_pct || 100}
        timeMs={submissionResult?.total_time_ms || 45}
        warId={warId}
        onClose={() => setShowCelebration(false)}
      />
    </div>
  );
}
