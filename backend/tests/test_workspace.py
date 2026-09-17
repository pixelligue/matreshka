from __future__ import annotations

import tomllib
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent


def test_project_name_is_not_deepseek_scoped() -> None:
    data = tomllib.loads((BACKEND / "pyproject.toml").read_text(encoding="utf-8"))
    name = data["project"]["name"]
    assert name == "matreshka-api"
    assert not name.startswith("@deepseek-ai/")


def test_pnpm_workspace_has_no_backend_glob() -> None:
    text = (ROOT / "pnpm-workspace.yaml").read_text(encoding="utf-8")
    assert "- backend" not in text
    assert "backend/*" not in text
    assert "backend/**" not in text


def test_compose_binds_datastores_to_loopback() -> None:
    text = (BACKEND / "compose.yaml").read_text(encoding="utf-8")
    assert "127.0.0.1:5432:5432" in text
    assert "127.0.0.1:6379:6379" in text
    assert "--requirepass" in text


def test_readme_binds_api_to_port_8016() -> None:
    text = (BACKEND / "README.md").read_text(encoding="utf-8")
    assert "fastapi dev --port 8016 --host 127.0.0.1" in text


def test_readme_documents_desktop_update_feed() -> None:
    text = (BACKEND / "README.md").read_text(encoding="utf-8")
    assert "GET /v1/updates/desktop/{target}/{name}" in text
    assert "matreshka-api publish-desktop" in text
    example = (BACKEND / ".env.example").read_text(encoding="utf-8")
    assert "UPDATE_ARTIFACT_ROOT=" in example
