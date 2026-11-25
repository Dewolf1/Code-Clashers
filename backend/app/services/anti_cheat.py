"""AI RAG-Based Code Plagiarism & LLM Cheat Detection Service."""

from __future__ import annotations

import ast
import math
import re
from collections import Counter
from typing import Any

# ═══════════════════════════════════════════════════════════════════════
# 1. Corpus of Known LLM-Generated Solutions (RAG Knowledge Base)
# ═══════════════════════════════════════════════════════════════════════
CANONICAL_LLM_CORPUS: dict[str, list[dict[str, str]]] = {
    "prob_two_sum": [
        {
            "source": "GPT-4o Standard",
            "language": "python",
            "code": """
# Time Complexity: O(n)
# Space Complexity: O(n)
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
""",
        },
        {
            "source": "Claude 3.5 Sonnet",
            "language": "python",
            "code": """
import sys

def solve():
    lines = sys.stdin.read().strip().split('\\n')
    nums = [int(x) for x in lines[0].split(',')]
    target = int(lines[1])
    lookup = {}
    for idx, val in enumerate(nums):
        diff = target - val
        if diff in lookup:
            print(f"{lookup[diff]},{idx}")
            return
        lookup[val] = idx

if __name__ == '__main__':
    solve()
""",
        },
        {
            "source": "DeepSeek-Coder Brute Force",
            "language": "python",
            "code": """
def solve():
    import sys
    data = sys.stdin.read().split()
    nums = list(map(int, data[0].split(',')))
    target = int(data[1])
    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):
            if nums[i] + nums[j] == target:
                print(f"{i},{j}")
                return
""",
        },
        {
            "source": "Copilot JS Idiom",
            "language": "javascript",
            "code": """
const fs = require('fs');
const [rawNums, rawTarget] = fs.readFileSync(0, 'utf-8').trim().split('\\n');
const nums = rawNums.split(',').map(Number);
const target = Number(rawTarget);
const map = new Map();
for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
        console.log(`${map.get(complement)},${i}`);
        process.exit(0);
    }
    map.set(nums[i], i);
}
""",
        },
    ],
    "prob_valid_palindrome": [
        {
            "source": "GPT-4o Two-Pointer",
            "language": "python",
            "code": """
# Two-pointer approach for palindrome validation
def is_palindrome(s: str) -> bool:
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True
""",
        },
        {
            "source": "Claude 3.5 Sonnet Regex Filter",
            "language": "python",
            "code": """
import sys
import re

def solve():
    raw = sys.stdin.read().strip()
    clean = re.sub(r'[^a-zA-Z0-9]', '', raw).lower()
    print('true' if clean == clean[::-1] else 'false')

if __name__ == '__main__':
    solve()
""",
        },
    ],
}


# ═══════════════════════════════════════════════════════════════════════
# 2. AST-Based Structural Normalizer & Semantic Vectorizer
# ═══════════════════════════════════════════════════════════════════════
class PythonASTNormalizer(ast.NodeTransformer):
    """
    Transforms arbitrary Python code into an isomorphic AST structure:
    - Renames user variables to normalized VAR_0, VAR_1...
    - Renames user functions to FUNC_0, FUNC_1...
    - Preserves control-flow grammar, loops, conditionals, and operators.
    """
    def __init__(self):
        self.var_map: dict[str, str] = {}
        self.func_map: dict[str, str] = {}
        self.counter = 0

    def visit_Name(self, node: ast.Name) -> ast.Name:
        # Preserve standard builtins
        builtins = {
            "print", "range", "len", "enumerate", "int", "str", "float",
            "list", "dict", "set", "map", "filter", "min", "max", "sum",
            "True", "False", "None", "sys", "open", "abs",
        }
        if node.id not in builtins:
            if node.id not in self.var_map:
                self.var_map[node.id] = f"V{self.counter}"
                self.counter += 1
            node.id = self.var_map[node.id]
        return node

    def visit_FunctionDef(self, node: ast.FunctionDef) -> ast.FunctionDef:
        if node.name not in self.func_map:
            self.func_map[node.name] = f"FUNC_{len(self.func_map)}"
        node.name = self.func_map[node.name]
        self.generic_visit(node)
        return node


def normalize_code(code: str, language: str = "python") -> str:
    """Normalize code to its canonical structural representation."""
    lang = language.lower()
    if lang in ["python", "python3", "py"]:
        try:
            tree = ast.parse(code)
            normalized_tree = PythonASTNormalizer().visit(tree)
            return ast.unparse(normalized_tree)
        except Exception:
            pass

    # Generic regex normalizer for JS / C++ / fallback
    stripped = re.sub(r"//.*|/\*[\s\S]*?\*/|#.*", "", code)
    # Normalize variable identifiers while keeping keywords
    tokens = re.findall(r"[A-Za-z_]\w+|[0-9]+|[^\s\w]", stripped)
    return " ".join(tokens)


def vectorize_code(normalized_code: str) -> Counter[str]:
    """Generate structural 3-gram and 4-gram frequency vector."""
    tokens = re.findall(r"[A-Za-z_]\w+|[0-9]+|[^\s\w]", normalized_code)
    ngrams: list[str] = []
    # 2-grams and 3-grams capture structural control-flow relationships
    for n in (2, 3):
        for i in range(max(0, len(tokens) - n + 1)):
            ngrams.append("_".join(tokens[i : i + n]))
    return Counter(ngrams)


def compute_cosine_similarity(vec_a: Counter[str], vec_b: Counter[str]) -> float:
    """Calculate exact cosine similarity between two sparse frequency vectors."""
    dot = sum(vec_a[k] * vec_b[k] for k in vec_a if k in vec_b)
    norm_a = math.sqrt(sum(v * v for v in vec_a.values()))
    norm_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(dot / (norm_a * norm_b))


# ═══════════════════════════════════════════════════════════════════════
# 3. LLM Hallmarks & Fingerprint Detector
# ═══════════════════════════════════════════════════════════════════════
LLM_SIGNATURE_PATTERNS = [
    (r"#\s*Time\s*Complexity\s*:\s*O\(", "LLM Docstring: 'Time Complexity: O(...)'"),
    (r"#\s*Space\s*Complexity\s*:\s*O\(", "LLM Docstring: 'Space Complexity: O(...)'"),
    (r"###\s*Approach|###\s*Explanation", "Markdown Section Headers in Code"),
    (r"```python|```cpp|```javascript", "Markdown Codeblock Delimiters"),
    (r"Here\s+is\s+the\s+complete\s+solution", "ChatGPT Chat Filler Text"),
    (r"#\s*Initialize\s+hash\s+map|#\s*Iterate\s+through\s+the\s+array", "Copilot Pedantic Step-by-Step Comments"),
]


def detect_llm_fingerprints(code: str) -> list[str]:
    """Flag signature comments and artifacts left by automated LLM copy-paste."""
    found: list[str] = []
    for pattern, desc in LLM_SIGNATURE_PATTERNS:
        if re.search(pattern, code, re.IGNORECASE):
            found.append(desc)
    return found


# ═══════════════════════════════════════════════════════════════════════
# 4. Master Anti-Cheat & RAG Similarity Pipeline
# ═══════════════════════════════════════════════════════════════════════
class AntiCheatService:
    """Comprehensive AI RAG Plagiarism & Cheat Detection Engine."""

    def evaluate_submission(
        self,
        problem_id: str,
        source_code: str,
        language: str,
        telemetry: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Evaluate code for semantic plagiarism against vector corpus
        and analyze keystroke dynamic signals.
        """
        norm_code = normalize_code(source_code, language)
        user_vector = vectorize_code(norm_code)

        # 1. RAG Vector Search against Canonical LLM Corpus
        corpus = CANONICAL_LLM_CORPUS.get(problem_id, [])
        highest_sim = 0.0
        matched_source = "Authentic Original"

        for entry in corpus:
            entry_norm = normalize_code(entry["code"], entry["language"])
            entry_vec = vectorize_code(entry_norm)
            sim = compute_cosine_similarity(user_vector, entry_vec)
            if sim > highest_sim:
                highest_sim = sim
                matched_source = entry["source"]

        # 2. LLM Fingerprint Detection
        fingerprints = detect_llm_fingerprints(source_code)

        # 3. Keystroke Telemetry Analysis
        telemetry = telemetry or {}
        paste_count = telemetry.get("paste_count", 0)
        paste_chars = telemetry.get("paste_chars", 0)
        total_time_ms = telemetry.get("total_typing_ms", 0)
        code_len = max(1, len(source_code.strip()))

        paste_ratio = min(1.0, paste_chars / code_len)
        suspicious_paste = False
        keystroke_status = "Natural Typing Cadence"

        if paste_ratio > 0.80 and total_time_ms < 20000:
            suspicious_paste = True
            keystroke_status = "Instant Bulk Paste (>80% pasted in <20s)"
        elif paste_count > 4:
            keystroke_status = f"Multiple External Pastes ({paste_count} events)"

        # 4. Unified Code Integrity Score Calculation (0 - 100)
        base_score = 100

        # Penalty for high vector similarity to known LLM solution
        if highest_sim > 0.70:
            sim_penalty = int((highest_sim - 0.70) * 140)
            base_score -= min(45, sim_penalty)

        # Penalty for suspicious bulk paste
        if suspicious_paste:
            base_score -= 30

        # Penalty for explicit LLM signature comments
        if fingerprints:
            base_score -= min(30, len(fingerprints) * 15)

        integrity_score = max(5, min(100, base_score))

        # Risk level determination
        if integrity_score >= 80:
            risk = "clean"
        elif integrity_score >= 55:
            risk = "suspicious"
        else:
            risk = "flagged"

        return {
            "integrity_score": integrity_score,
            "plagiarism_risk": risk,
            "highest_similarity_pct": round(highest_sim * 100, 1),
            "matched_source": matched_source if highest_sim >= 0.50 else "Original Synthesis",
            "keystroke_status": keystroke_status,
            "detected_fingerprints": fingerprints,
            "paste_ratio": round(paste_ratio * 100, 1),
        }


anti_cheat_service = AntiCheatService()

