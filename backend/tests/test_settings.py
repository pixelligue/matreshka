from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

from matreshka_api.settings import Settings, load_settings


def _clean_env(base: dict[str, str]) -> dict[str, str]:
    env = dict(base)
    env.pop("DATABASE_URL", None)
    env.pop("REDIS_URL", None)
    env.pop("LLM_UPSTREAM_BASE_URL", None)
    env.pop("LLMTOKENAPI_API_KEY", None)
    return env


def _with_other_required(env: dict[str, str]) -> dict[str, str]:
    env.setdefault("DATABASE_URL", "sqlite:///test.db")
    env.setdefault("REDIS_URL", "redis://127.0.0.1:6379/0")
    env.setdefault("LLM_UPSTREAM_BASE_URL", "https://upstream.test")
    env.setdefault("LLMTOKENAPI_API_KEY", "sk_test_upstream_key")
    return env


def test_missing_database_url_exits_and_names_variable(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    monkeypatch.setenv("LLM_UPSTREAM_BASE_URL", "https://upstream.test")
    monkeypatch.setenv("LLMTOKENAPI_API_KEY", "sk_test_upstream_key")
    with pytest.raises(SystemExit) as exc:
        load_settings()
    assert exc.value.code != 0
    assert "DATABASE_URL" in capsys.readouterr().err


def test_missing_redis_url_exits_and_names_variable(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("DATABASE_URL", "sqlite:///test.db")
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.setenv("LLM_UPSTREAM_BASE_URL", "https://upstream.test")
    monkeypatch.setenv("LLMTOKENAPI_API_KEY", "sk_test_upstream_key")
    with pytest.raises(SystemExit) as exc:
        load_settings()
    assert exc.value.code != 0
    assert "REDIS_URL" in capsys.readouterr().err


def test_process_exits_nonzero_when_database_url_missing(tmp_path: Path) -> None:
    env = _with_other_required(_clean_env(os.environ))
    env.pop("DATABASE_URL", None)
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from matreshka_api.settings import load_settings; load_settings()",
        ],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert "DATABASE_URL" in result.stderr


def test_process_exits_nonzero_when_redis_url_missing(tmp_path: Path) -> None:
    env = _with_other_required(_clean_env(os.environ))
    env.pop("REDIS_URL", None)
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from matreshka_api.settings import load_settings; load_settings()",
        ],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert "REDIS_URL" in result.stderr


def test_non_positive_session_ttl_is_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(
            database_url="sqlite:///test.db",
            redis_url="redis://127.0.0.1:6379/0",
            llm_upstream_base_url="https://upstream.test",
            llmtokenapi_api_key="sk_test_upstream_key",
            session_ttl_seconds=0,
        )


def test_missing_upstream_key_exits_and_names_variable(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("DATABASE_URL", "sqlite:///test.db")
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    monkeypatch.setenv("LLM_UPSTREAM_BASE_URL", "https://upstream.test")
    monkeypatch.delenv("LLMTOKENAPI_API_KEY", raising=False)
    with pytest.raises(SystemExit) as exc:
        load_settings()
    assert exc.value.code != 0
    assert "LLMTOKENAPI_API_KEY" in capsys.readouterr().err
