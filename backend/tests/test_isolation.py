from __future__ import annotations

from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
SRC = BACKEND / "src"


def test_backend_does_not_import_deepseek_packages() -> None:
    for path in SRC.rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        assert "@deepseek-ai/" not in text, path
    pyproject = (BACKEND / "pyproject.toml").read_text(encoding="utf-8")
    assert "@deepseek-ai/" not in pyproject
    assert "httpx" in pyproject


def test_env_example_has_empty_upstream_key() -> None:
    example = (BACKEND / ".env.example").read_text(encoding="utf-8")
    for line in example.splitlines():
        if line.startswith("LLMTOKENAPI_API_KEY="):
            assert line.split("=", 1)[1] == ""
            return
    raise AssertionError("LLMTOKENAPI_API_KEY missing from .env.example")
