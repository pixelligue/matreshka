from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from fakeredis import FakeAsyncRedis

from matreshka_api.cli import main
from matreshka_api.main import create_app
from matreshka_api.updates import publish_desktop
from tests.conftest import make_settings


def _app(tmp_path: Path, *, root: Path | None) -> TestClient:
    settings = make_settings(
        tmp_path,
        **({"update_artifact_root": str(root)} if root is not None else {}),
    )
    redis = FakeAsyncRedis(decode_responses=True)
    return TestClient(create_app(settings=settings, redis_client=redis))


def test_windows_channel_without_token(tmp_path: Path) -> None:
    root = tmp_path / "artifacts"
    channel = root / "win-x64" / "latest.yml"
    channel.parent.mkdir(parents=True)
    channel.write_text("version: 1.2.3\n", encoding="utf-8")
    with _app(tmp_path, root=root) as client:
        response = client.get("/v1/updates/desktop/win-x64/latest.yml")
    assert response.status_code == 200
    assert "version: 1.2.3" in response.text


def test_unknown_target_is_404(tmp_path: Path) -> None:
    root = tmp_path / "artifacts"
    (root / "linux-x64").mkdir(parents=True)
    (root / "linux-x64" / "latest.yml").write_text("version: 1\n", encoding="utf-8")
    with _app(tmp_path, root=root) as client:
        response = client.get("/v1/updates/desktop/linux-x64/latest.yml")
    assert response.status_code == 404


def test_missing_channel_is_404(tmp_path: Path) -> None:
    root = tmp_path / "artifacts"
    (root / "win-x64").mkdir(parents=True)
    with _app(tmp_path, root=root) as client:
        response = client.get("/v1/updates/desktop/win-x64/latest.yml")
    assert response.status_code == 404


def test_unset_root_is_404_and_process_starts(tmp_path: Path) -> None:
    with _app(tmp_path, root=None) as client:
        health = client.get("/health")
        response = client.get("/v1/updates/desktop/win-x64/latest.yml")
    assert health.status_code in {200, 503}
    assert response.status_code == 404


def test_parent_segment_name_is_404(tmp_path: Path) -> None:
    root = tmp_path / "artifacts"
    (root / "win-x64").mkdir(parents=True)
    with _app(tmp_path, root=root) as client:
        response = client.get("/v1/updates/desktop/win-x64/..")
    assert response.status_code == 404


def test_publish_desktop_copies_windows_feed(tmp_path: Path) -> None:
    source = tmp_path / "packaged"
    source.mkdir()
    (source / "latest.yml").write_text(
        "version: 1.2.3\nfiles:\n  - url: app.exe\n",
        encoding="utf-8",
    )
    (source / "app.exe").write_bytes(b"installer")
    root = tmp_path / "artifacts"
    settings = make_settings(tmp_path, update_artifact_root=str(root))
    publish_desktop("win-x64", source, settings=settings)
    with _app(tmp_path, root=root) as client:
        yaml_response = client.get("/v1/updates/desktop/win-x64/latest.yml")
        exe = client.get("/v1/updates/desktop/win-x64/app.exe")
    assert yaml_response.status_code == 200
    assert "app.exe" in yaml_response.text
    assert exe.status_code == 200
    assert exe.content == b"installer"


def test_publish_desktop_without_root_exits_naming_variable(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = tmp_path / "packaged"
    source.mkdir()
    (source / "latest.yml").write_text("version: 1\n", encoding="utf-8")
    settings = make_settings(tmp_path)
    try:
        publish_desktop("win-x64", source, settings=settings)
    except SystemExit as exc:
        assert exc.code != 0
    else:
        raise AssertionError("expected SystemExit")
    assert "UPDATE_ARTIFACT_ROOT" in capsys.readouterr().err


def test_cli_publish_desktop_requires_root(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    source = tmp_path / "packaged"
    source.mkdir()
    (source / "latest.yml").write_text("version: 1\n", encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{(tmp_path / 't.db').as_posix()}")
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    monkeypatch.setenv("LLM_UPSTREAM_BASE_URL", "https://upstream.test")
    monkeypatch.setenv("LLMTOKENAPI_API_KEY", "sk_test")
    monkeypatch.delenv("UPDATE_ARTIFACT_ROOT", raising=False)
    try:
        main(["publish-desktop", "--target", "win-x64", "--from", str(source)])
    except SystemExit as exc:
        assert exc.code != 0
    else:
        raise AssertionError("expected SystemExit")
    assert "UPDATE_ARTIFACT_ROOT" in capsys.readouterr().err
