"""Judge0 API client for code submission and execution."""

from __future__ import annotations

import httpx

from app.config import settings

# Judge0 language IDs
LANGUAGE_IDS = {
    "python": 71,       # Python 3
    "cpp": 54,          # C++ (GCC 9.2.0)
    "java": 62,         # Java (OpenJDK 13.0.1)
    "javascript": 63,   # JavaScript (Node.js 12.14.0)
    "c": 50,            # C (GCC 9.2.0)
    "go": 60,           # Go (1.13.5)
    "rust": 73,         # Rust (1.40.0)
}


class Judge0Client:
    """Async client for the Judge0 REST API."""

    def __init__(self):
        self.base_url = settings.JUDGE0_API_URL.rstrip("/")
        self.headers = {}
        if settings.JUDGE0_AUTH_TOKEN:
            self.headers["X-Auth-Token"] = settings.JUDGE0_AUTH_TOKEN

    async def submit(
        self,
        source_code: str,
        language: str,
        stdin: str = "",
        expected_output: str = "",
        time_limit: float = 2.0,
        memory_limit: int = 262144,
    ) -> dict:
        """Submit code for execution. Returns the submission token."""
        language_id = LANGUAGE_IDS.get(language)
        if language_id is None:
            raise ValueError(f"Unsupported language: {language}")

        payload = {
            "source_code": source_code,
            "language_id": language_id,
            "stdin": stdin,
            "expected_output": expected_output,
            "cpu_time_limit": time_limit,
            "memory_limit": memory_limit,
            "redirect_stderr_to_stdout": True,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/submissions?base64_encoded=false&wait=false",
                json=payload,
                headers=self.headers,
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()

    async def get_submission(self, token: str) -> dict:
        """Get the result of a submission by its token."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/submissions/{token}?base64_encoded=false",
                headers=self.headers,
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()

    async def submit_batch(
        self,
        source_code: str,
        language: str,
        test_cases: list[dict],
        time_limit: float = 2.0,
        memory_limit: int = 262144,
    ) -> list[dict]:
        """Submit code against multiple test cases in one batch."""
        language_id = LANGUAGE_IDS.get(language)
        if language_id is None:
            raise ValueError(f"Unsupported language: {language}")

        submissions = []
        for tc in test_cases:
            submissions.append({
                "source_code": source_code,
                "language_id": language_id,
                "stdin": tc.get("input", ""),
                "expected_output": tc.get("expected_output", ""),
                "cpu_time_limit": time_limit,
                "memory_limit": memory_limit,
                "redirect_stderr_to_stdout": True,
            })

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/submissions/batch?base64_encoded=false",
                json={"submissions": submissions},
                headers=self.headers,
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    async def get_batch(self, tokens: list[str]) -> list[dict]:
        """Poll a batch of submissions by their tokens."""
        token_str = ",".join(tokens)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/submissions/batch?tokens={token_str}&base64_encoded=false",
                headers=self.headers,
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json().get("submissions", [])

    async def get_languages(self) -> list[dict]:
        """List available languages on the Judge0 instance."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/languages",
                headers=self.headers,
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()


# Singleton
judge0_client = Judge0Client()
