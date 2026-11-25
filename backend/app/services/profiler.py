"""Algorithmic Big-O Complexity Profiler Service."""

from __future__ import annotations

import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from typing import Any


def _set_resource_limits(is_java: bool = False):
    """POSIX resource quota: 256MB memory limit & max processes."""
    if sys.platform != "linux":
        return
    try:
        import resource
        if not is_java:
            MEM_LIMIT = 256 * 1024 * 1024  # 256 MB
            resource.setrlimit(resource.RLIMIT_AS, (MEM_LIMIT, MEM_LIMIT))
        resource.setrlimit(resource.RLIMIT_NPROC, (50, 50))
    except Exception:
        pass



def generate_benchmark_input(n: int, problem_id: str) -> str:
    """Generate synthetic inputs of size N for complexity benchmarking."""
    if problem_id == "prob_two_sum":
        # Comma-separated array of size N, target sum of first and last
        nums = [str(i * 2 + 1) for i in range(n)]
        target = str((n - 1) * 2 + 2)
        return f"{','.join(nums)}\n{target}"
    elif problem_id == "prob_valid_palindrome":
        # Palindrome of length N
        half = "abcde" * (n // 10 + 1)
        half = half[: n // 2]
        return half + half[::-1]
    else:
        # Default: N space-separated integers
        return " ".join(str(i) for i in range(n))


def fit_complexity(data_points: list[dict[str, Any]]) -> str:
    """
    Empirical curve fitting to estimate asymptotic complexity:
    Compares correlation with O(1), O(N), O(N log N), O(N^2).
    """
    valid = [p for p in data_points if p.get("time_ms", -1) > 0]
    if len(valid) < 3:
        return "O(N)"

    times = [max(0.01, p["time_ms"]) for p in valid]
    ns = [p["n"] for p in valid]

    # Ratio test between last two points
    t_ratio = times[-1] / times[0]
    n_ratio = ns[-1] / ns[0]

    if t_ratio < 1.35:
        return "O(1) Constant Time"
    elif t_ratio < n_ratio * 1.5:
        return "O(N) Linear Time"
    elif t_ratio < n_ratio * math.log2(ns[-1]) * 1.8:
        return "O(N log N) Linearithmic Time"
    else:
        return "O(N²) Quadratic Time"


def profile_solution(
    source_code: str,
    problem_id: str = "prob_two_sum",
    language: str = "python",
) -> dict[str, Any]:
    """Execute code against scaling N inputs and record runtime benchmarks."""
    n_steps = [100, 500, 1000, 2500, 5000]
    benchmarks: list[dict[str, Any]] = []
    lang = language.lower().strip()
    preexec = _set_resource_limits if sys.platform == "linux" else None

    # Setup environment / files
    temp_dir = tempfile.mkdtemp()
    exec_cmd: list[str] = []

    try:
        if lang in ["python", "python3", "py"]:
            py_file = os.path.join(temp_dir, "solution.py")
            with open(py_file, "w", encoding="utf-8") as f:
                f.write(source_code)
            exec_cmd = [sys.executable, py_file]
        elif lang in ["javascript", "js", "node", "nodejs"]:
            node_bin = shutil.which("node") or "node"
            js_file = os.path.join(temp_dir, "solution.js")
            with open(js_file, "w", encoding="utf-8") as f:
                f.write(source_code)
            exec_cmd = [node_bin, js_file]
        elif lang in ["cpp", "c++", "cxx"]:
            cpp_file = os.path.join(temp_dir, "solution.cpp")
            bin_file = os.path.join(temp_dir, "solution")
            with open(cpp_file, "w", encoding="utf-8") as f:
                f.write(source_code)
            c_proc = subprocess.run(
                ["g++", "-O2", "-std=c++17", cpp_file, "-o", bin_file],
                capture_output=True,
                timeout=8.0,
                preexec_fn=preexec,
            )
            if c_proc.returncode != 0:
                return {
                    "benchmarks": [],
                    "baseline_quadratic": [],
                    "baseline_linear": [],
                    "estimated_complexity": "Compilation Failed",
                    "status": "compilation_error",
                    "error": c_proc.stderr.decode("utf-8", errors="replace").strip(),
                }
            exec_cmd = [bin_file]
        elif lang in ["java"]:
            match = re.search(r"public\s+class\s+(\w+)", source_code)
            class_name = match.group(1) if match else "Solution"
            java_file = os.path.join(temp_dir, f"{class_name}.java")
            with open(java_file, "w", encoding="utf-8") as f:
                f.write(source_code)
            j_proc = subprocess.run(
                ["javac", java_file],
                capture_output=True,
                timeout=10.0,
                preexec_fn=(lambda: _set_resource_limits(is_java=True)) if sys.platform == "linux" else None,
            )
            if j_proc.returncode != 0:
                return {
                    "benchmarks": [],
                    "baseline_quadratic": [],
                    "baseline_linear": [],
                    "estimated_complexity": "Compilation Failed",
                    "status": "compilation_error",
                    "error": j_proc.stderr.decode("utf-8", errors="replace").strip(),
                }
            exec_cmd = ["java", "-Xmx256m", "-Xms32m", "-Xss512k", "-cp", temp_dir, class_name]
            preexec = (lambda: _set_resource_limits(is_java=True)) if sys.platform == "linux" else None

        else:
            return {
                "benchmarks": [],
                "baseline_quadratic": [],
                "baseline_linear": [],
                "estimated_complexity": f"Unsupported Language ({language})",
                "status": "error",
            }

        for n in n_steps:
            test_inp = generate_benchmark_input(n, problem_id)
            t0 = time.perf_counter()
            proc = subprocess.run(
                exec_cmd,
                input=test_inp.encode("utf-8"),
                capture_output=True,
                timeout=3.0,
                preexec_fn=preexec,
            )
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
            if proc.returncode != 0:
                elapsed_ms = -1.0
            benchmarks.append({"n": n, "time_ms": elapsed_ms})

        estimated = fit_complexity(benchmarks)

        # Compute theoretical baselines normalized to first positive benchmark
        valid_b = [b for b in benchmarks if b["time_ms"] > 0]
        base_t = valid_b[0]["time_ms"] if valid_b else 1.0
        base_n = valid_b[0]["n"] if valid_b else 100

        baseline_quadratic = [
            {"n": b["n"], "time_ms": round(base_t * ((b["n"] / base_n) ** 2), 2)}
            for b in benchmarks
        ]
        baseline_linear = [
            {"n": b["n"], "time_ms": round(base_t * (b["n"] / base_n), 2)}
            for b in benchmarks
        ]

        return {
            "benchmarks": benchmarks,
            "baseline_quadratic": baseline_quadratic,
            "baseline_linear": baseline_linear,
            "estimated_complexity": estimated,
            "status": "success",
        }
    except subprocess.TimeoutExpired:
        return {
            "benchmarks": benchmarks,
            "baseline_quadratic": [],
            "baseline_linear": [],
            "estimated_complexity": "O(N²) or Higher (Timeout Exceeded)",
            "status": "timeout",
        }
    except Exception as exc:
        return {
            "benchmarks": benchmarks,
            "baseline_quadratic": [],
            "baseline_linear": [],
            "estimated_complexity": "Indeterminate",
            "status": f"error: {exc}",
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
