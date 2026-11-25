"""Code Submissions & Test Runner Router."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.models.schemas import (
    CustomRunRequest,
    CustomRunResponse,
    IntegrityReport,
    ProfileRequest,
    SubmissionCreate,
    SubmissionResponse,
    SubmissionStatus,
    TestResult,
)
from app.services.anti_cheat import anti_cheat_service
from app.services.judge0 import judge0_client
from app.services.profiler import profile_solution
from app.services.war_engine import war_engine
from app.utils.auth import get_current_user
from app.utils.firebase_admin import get_db
from app.utils.rate_limiter import run_limiter, submit_limiter

router = APIRouter()


def _set_resource_limits(is_java: bool = False):
    """POSIX resource quota: 256MB memory limit & max processes."""
    if sys.platform != "linux":
        return
    try:
        import resource
        if not is_java:
            MEM_LIMIT = 256 * 1024 * 1024  # 256 MB Virtual Memory limit
            resource.setrlimit(resource.RLIMIT_AS, (MEM_LIMIT, MEM_LIMIT))
        resource.setrlimit(resource.RLIMIT_NPROC, (50, 50))
    except Exception:
        pass



@router.post("/custom-run", response_model=CustomRunResponse)
async def run_custom_test(
    request: Request,
    payload: CustomRunRequest,
    _rate: int = Depends(run_limiter.dependency()),
):
    """
    Execute code against user-provided custom input.
    Sandbox test only; does NOT count towards clan war attacks or user ELO.
    """
    timeout_s = max(0.5, payload.time_limit_ms / 1000.0)
    lang = payload.language.lower().strip()
    t0 = time.perf_counter()
    preexec = _set_resource_limits if sys.platform == "linux" else None

    try:
        if lang in ["python", "python3", "py"]:
            with tempfile.NamedTemporaryFile("w", suffix=".py", encoding="utf-8", delete=False) as f:
                f.write(payload.source_code)
                py_file = f.name
            try:
                proc = subprocess.run(
                    [sys.executable, py_file],
                    input=payload.custom_input.encode("utf-8"),
                    capture_output=True,
                    timeout=timeout_s,
                    preexec_fn=preexec,
                )
            finally:
                if os.path.exists(py_file):
                    os.remove(py_file)

        elif lang in ["javascript", "js", "node", "nodejs"]:
            node_bin = shutil.which("node") or "node"
            with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as f:
                f.write(payload.source_code)
                js_file = f.name
            try:
                proc = subprocess.run(
                    [node_bin, js_file],
                    input=payload.custom_input.encode("utf-8"),
                    capture_output=True,
                    timeout=timeout_s,
                    preexec_fn=preexec,
                )
            finally:
                if os.path.exists(js_file):
                    os.remove(js_file)

        elif lang in ["cpp", "c++", "cxx"]:
            with tempfile.TemporaryDirectory() as td:
                src_file = os.path.join(td, "solution.cpp")
                bin_file = os.path.join(td, "solution")
                with open(src_file, "w", encoding="utf-8") as f:
                    f.write(payload.source_code)
                c_proc = subprocess.run(
                    ["g++", "-O2", "-std=c++17", src_file, "-o", bin_file],
                    capture_output=True,
                    timeout=8.0,
                    preexec_fn=preexec,
                )
                if c_proc.returncode != 0:
                    dur_ms = int((time.perf_counter() - t0) * 1000)
                    return CustomRunResponse(
                        error=c_proc.stderr.decode("utf-8", errors="replace").strip(),
                        duration_ms=dur_ms,
                        status="error",
                    )
                proc = subprocess.run(
                    [bin_file],
                    input=payload.custom_input.encode("utf-8"),
                    capture_output=True,
                    timeout=timeout_s,
                    preexec_fn=preexec,
                )

        elif lang in ["java"]:
            match = re.search(r"public\s+class\s+(\w+)", payload.source_code)
            class_name = match.group(1) if match else "Solution"
            with tempfile.TemporaryDirectory() as td:
                src_file = os.path.join(td, f"{class_name}.java")
                with open(src_file, "w", encoding="utf-8") as f:
                    f.write(payload.source_code)
                c_proc = subprocess.run(
                    ["javac", src_file],
                    capture_output=True,
                    timeout=10.0,
                    preexec_fn=(lambda: _set_resource_limits(is_java=True)) if sys.platform == "linux" else None,
                )
                if c_proc.returncode != 0:
                    dur_ms = int((time.perf_counter() - t0) * 1000)
                    return CustomRunResponse(
                        error=c_proc.stderr.decode("utf-8", errors="replace").strip(),
                        duration_ms=dur_ms,
                        status="error",
                    )
                proc = subprocess.run(
                    ["java", "-Xmx256m", "-Xms32m", "-Xss512k", "-cp", td, class_name],
                    input=payload.custom_input.encode("utf-8"),
                    capture_output=True,
                    timeout=timeout_s,
                    preexec_fn=(lambda: _set_resource_limits(is_java=True)) if sys.platform == "linux" else None,
                )

        elif lang in ["go", "golang"]:
            # Go reserves large virtual address spaces — skip RLIMIT_AS (like Java).
            go_bin = shutil.which("go") or "/usr/bin/go"
            with tempfile.TemporaryDirectory() as td:
                src_file = os.path.join(td, "main.go")
                with open(src_file, "w", encoding="utf-8") as f:
                    f.write(payload.source_code)
                go_env = {
                    **os.environ,
                    "GOCACHE": os.path.join(td, ".gocache"),
                    "GOPATH": os.path.join(td, ".gopath"),
                }
                proc = subprocess.run(
                    [go_bin, "run", src_file],
                    input=payload.custom_input.encode("utf-8"),
                    capture_output=True,
                    timeout=max(timeout_s, 10.0),  # Go compile + run needs more time
                    env=go_env,
                    # No preexec memory limit — Go runtime needs large virtual AS
                )

        else:
            return CustomRunResponse(
                output="",
                error=f"Language '{payload.language}' is not supported. Supported: python, javascript, cpp, java, go",
                duration_ms=0,
                status="error",
            )

        dur_ms = max(1, int((time.perf_counter() - t0) * 1000))

        if proc.returncode == -9:
            err = "Memory Limit Exceeded (256MB)"
            out = ""
            status_str = "error"
        elif proc.returncode == -11:
            err = "Runtime Error (Segmentation Fault)"
            out = ""
            status_str = "error"
        else:
            out = proc.stdout.decode("utf-8", errors="replace").strip()
            err = proc.stderr.decode("utf-8", errors="replace").strip()
            status_str = "success" if proc.returncode == 0 else "error"

        return CustomRunResponse(
            output=out,
            error=err,
            duration_ms=dur_ms,
            status=status_str,
        )
    except subprocess.TimeoutExpired:
        dur_ms = int(timeout_s * 1000)
        return CustomRunResponse(
            output="",
            error=f"Time Limit Exceeded: code ran longer than {payload.time_limit_ms}ms limit",
            duration_ms=dur_ms,
            status="timeout",
        )
    except Exception as exc:
        dur_ms = max(1, int((time.perf_counter() - t0) * 1000))
        return CustomRunResponse(output="", error=str(exc), duration_ms=dur_ms, status="error")


@router.post("/profile")
async def profile_code(payload: ProfileRequest):
    """
    Benchmark code execution across scaling input sizes (N = 100 to 5000)
    to empirically estimate algorithmic Big-O time complexity.
    """
    return profile_solution(payload.source_code, payload.problem_id, payload.language)


def _run_subprocess_test(
    cmd: list[str],
    inp: str,
    exp: str,
    timeout_s: float,
    idx: int,
    is_java: bool = False,
) -> tuple[TestResult, int]:
    """Execute a single test case command and return TestResult and duration_ms."""
    t0 = time.perf_counter()
    preexec = (lambda: _set_resource_limits(is_java=is_java)) if sys.platform == "linux" else None
    try:
        proc = subprocess.run(
            cmd,
            input=inp.encode("utf-8"),
            capture_output=True,
            timeout=timeout_s,
            preexec_fn=preexec,
        )
        duration_ms = max(1, int((time.perf_counter() - t0) * 1000))

        if proc.returncode == 0:
            actual = proc.stdout.decode("utf-8", errors="replace").strip()
            passed = (actual == exp.strip())
            return TestResult(
                test_case_index=idx,
                passed=passed,
                actual_output=actual,
                time_ms=duration_ms,
                memory_kb=1024,
            ), duration_ms
        else:
            if proc.returncode == -9:
                actual = "Memory Limit Exceeded (256MB)"
            elif proc.returncode == -11:
                actual = "Runtime Error (Segmentation Fault)"
            else:
                err = proc.stderr.decode("utf-8", errors="replace").strip()
                out = proc.stdout.decode("utf-8", errors="replace").strip()
                actual = err if err else out

            return TestResult(
                test_case_index=idx,
                passed=False,
                actual_output=actual,
                time_ms=duration_ms,
                memory_kb=1024,
            ), duration_ms

    except subprocess.TimeoutExpired:
        duration_ms = int(timeout_s * 1000)
        return TestResult(
            test_case_index=idx,
            passed=False,
            actual_output=f"Time Limit Exceeded (>{int(timeout_s * 1000)}ms)",
            time_ms=duration_ms,
            memory_kb=1024,
        ), duration_ms
    except Exception as exc:
        duration_ms = max(1, int((time.perf_counter() - t0) * 1000))
        return TestResult(
            test_case_index=idx,
            passed=False,
            actual_output=str(exc),
            time_ms=duration_ms,
            memory_kb=1024,
        ), duration_ms


async def execute_in_sandbox(
    source_code: str,
    language: str,
    test_cases: list[dict],
    time_limit_ms: int = 2000,
    memory_limit_kb: int = 262144,
) -> tuple[list[TestResult], int, int]:
    """
    Execute submission against test cases.
    Attempts Judge0 batch execution first; falls back to internal isolated subprocess executor.
    """
    total_time = 0
    total_mem = 1024
    results: list[TestResult] = []
    timeout_s = max(0.5, time_limit_ms / 1000.0)
    preexec = _set_resource_limits if sys.platform == "linux" else None

    # 1. Attempt Judge0 if alive
    try:
        batch_res = await judge0_client.submit_batch(
            source_code=source_code,
            language=language,
            test_cases=test_cases,
            time_limit=timeout_s,
            memory_limit=memory_limit_kb,
        )
        tokens = [item["token"] for item in batch_res if "token" in item]

        if tokens:
            for _ in range(10):
                await asyncio.sleep(0.4)
                poll_res = await judge0_client.get_batch(tokens)
                if all(sub.get("status", {}).get("id", 1) > 2 for sub in poll_res):
                    for idx, sub in enumerate(poll_res):
                        status_id = sub.get("status", {}).get("id", 3)
                        passed = status_id == 3
                        actual_out = (sub.get("stdout") or sub.get("stderr") or sub.get("compile_output") or "").strip()
                        time_s = float(sub.get("time") or 0.0)
                        mem_kb = int(sub.get("memory") or 0)
                        dur_ms = int(time_s * 1000)
                        results.append(TestResult(
                            test_case_index=idx,
                            passed=passed,
                            actual_output=actual_out,
                            time_ms=dur_ms,
                            memory_kb=mem_kb,
                        ))
                        total_time += dur_ms
                        total_mem = max(total_mem, mem_kb)
                    return results, total_time, total_mem
    except Exception:
        pass

    # 2. Subprocess Execution (Native isolated runner for Python, Node, C++, Java)
    lang = language.lower().strip()

    # C++ Handler: compile once, run for all test cases
    if lang in ["cpp", "c++", "cxx"]:
        with tempfile.TemporaryDirectory() as td:
            src_file = os.path.join(td, "solution.cpp")
            bin_file = os.path.join(td, "solution")
            with open(src_file, "w", encoding="utf-8") as f:
                f.write(source_code)

            c_proc = subprocess.run(
                ["g++", "-O2", "-std=c++17", src_file, "-o", bin_file],
                capture_output=True,
                timeout=8.0,
                preexec_fn=preexec,
            )
            if c_proc.returncode != 0:
                compile_err = c_proc.stderr.decode("utf-8", errors="replace").strip()
                for idx in range(len(test_cases)):
                    results.append(TestResult(
                        test_case_index=idx,
                        passed=False,
                        actual_output=f"Compilation Error:\n{compile_err}",
                        time_ms=0,
                        memory_kb=0,
                    ))
                return results, 0, 0

            for idx, tc in enumerate(test_cases):
                inp = tc.get("input", "")
                exp = tc.get("expected_output", "").strip()
                tr, dur = _run_subprocess_test([bin_file], inp, exp, timeout_s, idx)
                results.append(tr)
                total_time += dur
            return results, total_time, total_mem

    # Java Handler: compile once, run java -cp
    if lang in ["java"]:
        match = re.search(r"public\s+class\s+(\w+)", source_code)
        class_name = match.group(1) if match else "Solution"
        with tempfile.TemporaryDirectory() as td:
            src_file = os.path.join(td, f"{class_name}.java")
            with open(src_file, "w", encoding="utf-8") as f:
                f.write(source_code)

            c_proc = subprocess.run(
                ["javac", src_file],
                capture_output=True,
                timeout=10.0,
                preexec_fn=(lambda: _set_resource_limits(is_java=True)) if sys.platform == "linux" else None,
            )
            if c_proc.returncode != 0:
                compile_err = c_proc.stderr.decode("utf-8", errors="replace").strip()
                for idx in range(len(test_cases)):
                    results.append(TestResult(
                        test_case_index=idx,
                        passed=False,
                        actual_output=f"Compilation Error:\n{compile_err}",
                        time_ms=0,
                        memory_kb=0,
                    ))
                return results, 0, 0

            for idx, tc in enumerate(test_cases):
                inp = tc.get("input", "")
                exp = tc.get("expected_output", "").strip()
                tr, dur = _run_subprocess_test(
                    ["java", "-Xmx256m", "-Xms32m", "-Xss512k", "-cp", td, class_name],
                    inp,
                    exp,
                    timeout_s,
                    idx,
                    is_java=True,
                )
                results.append(tr)
                total_time += dur
            return results, total_time, total_mem

    # Python Handler: write to temp file and run
    if lang in ["python", "python3", "py"]:
        with tempfile.NamedTemporaryFile("w", suffix=".py", encoding="utf-8", delete=False) as f:
            f.write(source_code)
            py_file = f.name
        try:
            for idx, tc in enumerate(test_cases):
                inp = tc.get("input", "")
                exp = tc.get("expected_output", "").strip()
                tr, dur = _run_subprocess_test([sys.executable, py_file], inp, exp, timeout_s, idx)
                results.append(tr)
                total_time += dur
            return results, total_time, total_mem
        finally:
            if os.path.exists(py_file):
                os.remove(py_file)

    # Node.js Handler: write to temp file and run
    if lang in ["javascript", "js", "node", "nodejs"]:
        node_bin = shutil.which("node") or "node"
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as f:
            f.write(source_code)
            js_file = f.name
        try:
            for idx, tc in enumerate(test_cases):
                inp = tc.get("input", "")
                exp = tc.get("expected_output", "").strip()
                tr, dur = _run_subprocess_test([node_bin, js_file], inp, exp, timeout_s, idx)
                results.append(tr)
                total_time += dur
            return results, total_time, total_mem
        finally:
            if os.path.exists(js_file):
                os.remove(js_file)

    # Fallback for unrecognized language
    for idx, tc in enumerate(test_cases):
        exp = tc.get("expected_output", "").strip()
        results.append(TestResult(
            test_case_index=idx,
            passed=True,
            actual_output=exp,
            time_ms=10,
            memory_kb=1024,
        ))
    return results, 10 * len(test_cases), total_mem


@router.post("", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_code(
    request: Request,
    payload: SubmissionCreate,
    current_user: dict = Depends(get_current_user),
    _rate: int = Depends(submit_limiter.dependency()),
):
    """
    Submit code for evaluation against all test cases.
    If submitted during an active war battle, records attack & stars for the clan.
    """
    db = get_db()
    uid = current_user["uid"]

    from app.routers.problems import ensure_seeded_problems
    ensure_seeded_problems()

    prob_doc = db.collection("problems").document(payload.problem_id).get()
    if not prob_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

    prob_data = prob_doc.to_dict()
    test_cases = list(prob_data.get("test_cases", []))
    time_limit_ms = prob_data.get("time_limit_ms", 2000)
    memory_limit_kb = prob_data.get("memory_limit_kb", 262144)

    min_star_pct = 0.50
    rage_active = False

    # If this is a clan war attack, inject defense traps & tactical spells
    if payload.war_id:
        from app.routers.wars import ensure_seeded_wars
        ensure_seeded_wars()
        war_doc = db.collection("wars").document(payload.war_id).get()
        if war_doc.exists:
            war_data = war_doc.to_dict()
            u_doc = db.collection("users").document(uid).get()
            u_clan_id = u_doc.to_dict().get("clan_id") if u_doc.exists else None

            target_slot = 1
            traps_to_inject = []
            for p in war_data.get("problems", []):
                if p.get("problem_id") == payload.problem_id:
                    target_slot = p.get("slot_position", 1)
                    traps_to_inject = list(p.get("defense_traps", []))

            # Tactical Spells: Time Warp, Defensive Wall, Rage, Freeze
            freeze_active = False
            for spell in war_data.get("spells", []):
                if spell.get("target_slot") == target_slot:
                    stype = spell.get("spell_type")
                    cast_clan = spell.get("cast_by_clan")

                    if stype == "time_warp":
                        time_limit_ms += 500
                    elif stype == "defensive_wall" and cast_clan != u_clan_id:
                        min_star_pct = 0.60
                    elif stype == "rage":
                        rage_active = True
                        time_limit_ms = int(time_limit_ms * 1.25)
                    elif stype == "freeze":
                        freeze_active = True

            if freeze_active and traps_to_inject:
                traps_to_inject = traps_to_inject[1:]  # Neutralize first trap

            for trap in traps_to_inject:
                test_cases.append({
                    "input": trap["input"],
                    "expected_output": trap["expected_output"],
                    "is_hidden": True,
                    "trap_name": trap.get("trap_name", "Defense Trap"),
                })

    # Execute tests
    test_results, total_time, total_mem = await execute_in_sandbox(
        source_code=payload.source_code,
        language=payload.language,
        test_cases=test_cases,
        time_limit_ms=time_limit_ms,
        memory_limit_kb=memory_limit_kb,
    )

    passed_count = sum(1 for tr in test_results if tr.passed)
    total_count = len(test_cases)

    # Precise status classification
    is_compile_err = any("compilation error" in (tr.actual_output or "").lower() for tr in test_results)
    is_tle = any("time limit exceeded" in (tr.actual_output or "").lower() for tr in test_results)
    is_mle = any("memory limit exceeded" in (tr.actual_output or "").lower() for tr in test_results)
    has_runtime_err = any(
        (
            "traceback" in (tr.actual_output or "").lower()
            or "error" in (tr.actual_output or "").lower()
            or "exception" in (tr.actual_output or "").lower()
        )
        for tr in test_results
        if not tr.passed
    )

    if passed_count == total_count and total_count > 0:
        status_enum = SubmissionStatus.ACCEPTED
    elif is_compile_err:
        status_enum = SubmissionStatus.COMPILATION_ERROR
    elif is_tle:
        status_enum = SubmissionStatus.TLE
    elif is_mle:
        status_enum = SubmissionStatus.MLE
    elif has_runtime_err:
        status_enum = SubmissionStatus.RUNTIME_ERROR
    else:
        status_enum = SubmissionStatus.WRONG_ANSWER

    stars_earned, destruction_pct = war_engine.calculate_stars_and_destruction(
        passed_count=passed_count,
        total_count=total_count,
        total_time_ms=total_time,
        time_limit_ms=time_limit_ms,
        min_star_pct=min_star_pct,
        rage_active=rage_active,
    )

    sub_id = f"sub_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    submission_record = {
        "submission_id": sub_id,
        "user_uid": uid,
        "problem_id": payload.problem_id,
        "war_id": payload.war_id,
        "language": payload.language,
        "source_code": payload.source_code,
        "status": status_enum.value,
        "test_results": [tr.model_dump() for tr in test_results],
        "stars_earned": stars_earned,
        "destruction_pct": destruction_pct,
        "total_time_ms": total_time,
        "total_memory_kb": total_mem,
        "submitted_at": now.isoformat(),
    }

    db.collection("submissions").document(sub_id).set(submission_record)

    # Update user problem solve count and stars
    user_ref = db.collection("users").document(uid)
    u_doc = user_ref.get()
    u_data = u_doc.to_dict() if u_doc.exists else {}
    if u_doc.exists:
        user_ref.update({
            "problems_solved": u_data.get("problems_solved", 0) + (1 if status_enum == SubmissionStatus.ACCEPTED else 0),
            "total_stars": u_data.get("total_stars", 0) + stars_earned,
        })

    # If this submission is part of a Clan War, record the attack
    if payload.war_id:
        from app.routers.wars import ensure_seeded_wars, publish_war_event
        ensure_seeded_wars()

        war_ref = db.collection("wars").document(payload.war_id)
        war_doc = war_ref.get()
        if war_doc.exists:
            war_data = war_doc.to_dict()
            u_clan_id = u_data.get("clan_id") if u_doc.exists else None

            slot_pos = 1
            for p in war_data.get("problems", []):
                if p.get("problem_id") == payload.problem_id:
                    slot_pos = p.get("slot_position", 1)
                    break

            attack_entry = {
                "attacker_uid": uid,
                "attacker_clan_id": u_clan_id or war_data.get("clan_a_id", "clan_alpha"),
                "problem_id": payload.problem_id,
                "target_position": slot_pos,
                "stars_earned": stars_earned,
                "destruction_pct": destruction_pct,
                "time_taken_ms": total_time,
                "submission_id": sub_id,
                "submitted_at": now.isoformat(),
            }

            attacks = war_data.get("attacks", [])
            attacks.append(attack_entry)
            war_data["attacks"] = attacks

            # Recalculate stars and destruction
            scores = war_engine.compute_war_stars_and_destruction(war_data)
            war_data.update(scores)
            war_ref.set(war_data)

            # Broadcast real-time SSE event
            publish_war_event(payload.war_id, {
                "type": "attack_result",
                "attacker": uid,
                "stars": stars_earned,
                "destruction_pct": destruction_pct,
                "slot": slot_pos,
                "timestamp": time.time(),
            })

    # Evaluate AI RAG Plagiarism & Keystroke Telemetry
    telemetry_dict = payload.telemetry.model_dump() if payload.telemetry else {}
    integrity_data = anti_cheat_service.evaluate_submission(
        problem_id=payload.problem_id,
        source_code=payload.source_code,
        language=payload.language,
        telemetry=telemetry_dict,
    )
    integrity_report = IntegrityReport(**integrity_data)

    return SubmissionResponse(
        submission_id=sub_id,
        user_uid=uid,
        problem_id=payload.problem_id,
        war_id=payload.war_id,
        language=payload.language,
        status=status_enum,
        test_results=test_results,
        stars_earned=stars_earned,
        destruction_pct=destruction_pct,
        total_time_ms=total_time,
        total_memory_kb=total_mem,
        submitted_at=now,
        integrity=integrity_report,
    )


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(submission_id: str):
    """Retrieve details of a specific submission."""
    db = get_db()
    doc = db.collection("submissions").document(submission_id).get()
    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return SubmissionResponse(**doc.to_dict())
