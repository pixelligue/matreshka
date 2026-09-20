"""Operator-facing cost report assets; data stays behind bearer authentication."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter(prefix="/analytics", tags=["usage"])
ASSETS = Path(__file__).parent / "assets"


@router.get("/costs", include_in_schema=False)
def costs_page() -> FileResponse:
    return FileResponse(
        ASSETS / "costs.html", media_type="text/html",
        headers={
            "Cache-Control": "no-store",
            "Content-Security-Policy": (
                "default-src 'none'; script-src 'self'; style-src 'self'; "
                "connect-src 'self'; base-uri 'none'; form-action 'self'"
            ),
        },
    )


@router.get("/costs.css", include_in_schema=False)
def costs_styles() -> FileResponse:
    return FileResponse(ASSETS / "costs.css", media_type="text/css")


@router.get("/costs.js", include_in_schema=False)
def costs_script() -> FileResponse:
    return FileResponse(ASSETS / "costs.js", media_type="text/javascript")
