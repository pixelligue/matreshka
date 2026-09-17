"""Unauthenticated Desktop update feed and operator publish CLI."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from matreshka_api.db import SettingsDep
from matreshka_api.settings import Settings, load_settings

ALLOWED_TARGETS = frozenset({"win-x64", "mac-arm64", "mac-x64"})
CHANNEL_FILE = {
    "win-x64": "latest.yml",
    "mac-arm64": "latest-mac.yml",
    "mac-x64": "latest-mac.yml",
}

router = APIRouter(prefix="/v1/updates/desktop", tags=["updates"])


def is_safe_name(name: str) -> bool:
    if not name or name in {".", ".."}:
        return False
    if "/" in name or "\\" in name or ".." in name:
        return False
    return not Path(name).is_absolute()


def resolve_artifact_file(root: str, target: str, name: str) -> Path | None:
    if target not in ALLOWED_TARGETS or not is_safe_name(name):
        return None
    target_dir = (Path(root) / target).resolve()
    path = (target_dir / name).resolve()
    try:
        path.relative_to(target_dir)
    except ValueError:
        return None
    if not path.is_file():
        return None
    return path


@router.get("/{target}/{name}")
async def get_desktop_update(
    target: str,
    name: str,
    settings: SettingsDep,
) -> FileResponse:
    root = settings.update_artifact_root
    if not root:
        raise HTTPException(status_code=404, detail="Not found")
    path = resolve_artifact_file(root, target, name)
    if path is None:
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)


def artifact_names_from_channel(text: str, channel_filename: str) -> list[str]:
    names = [channel_filename]
    stripped = text.lstrip()
    if stripped.startswith("{"):
        data = json.loads(stripped)
        path = data.get("path")
        if isinstance(path, str) and path:
            names.append(Path(path).name)
        files = data.get("files")
        if isinstance(files, list):
            for item in files:
                if isinstance(item, dict):
                    url = item.get("url")
                    if isinstance(url, str) and url:
                        names.append(Path(url).name)
        return list(dict.fromkeys(names))
    for line in text.splitlines():
        raw = line.strip()
        if raw.startswith("- "):
            raw = raw[2:].strip()
        if raw.startswith("url:") or raw.startswith("path:"):
            value = raw.split(":", 1)[1].strip().strip("\"'")
            if value:
                names.append(Path(value).name)
    return list(dict.fromkeys(names))


def publish_desktop(
    target: str,
    source: Path,
    settings: Settings | None = None,
) -> None:
    """Copy one target's channel YAML and named artifacts into UPDATE_ARTIFACT_ROOT."""
    resolved = settings if settings is not None else load_settings()
    if not resolved.update_artifact_root:
        sys.stderr.write("Missing required environment variable: UPDATE_ARTIFACT_ROOT\n")
        raise SystemExit(1)
    if target not in ALLOWED_TARGETS:
        sys.stderr.write(f"Unknown target: {target}\n")
        raise SystemExit(1)
    channel = CHANNEL_FILE[target]
    source_dir = source.resolve()
    channel_path = source_dir / channel
    if not channel_path.is_file():
        sys.stderr.write(f"Missing channel file: {channel}\n")
        raise SystemExit(1)
    names = artifact_names_from_channel(
        channel_path.read_text(encoding="utf-8"),
        channel,
    )
    destination = Path(resolved.update_artifact_root).resolve() / target
    destination.mkdir(parents=True, exist_ok=True)
    for name in names:
        if not is_safe_name(name):
            sys.stderr.write(f"Unsafe artifact name: {name}\n")
            raise SystemExit(1)
        src = source_dir / name
        if not src.is_file():
            sys.stderr.write(f"Missing artifact: {name}\n")
            raise SystemExit(1)
        shutil.copy2(src, destination / name)
