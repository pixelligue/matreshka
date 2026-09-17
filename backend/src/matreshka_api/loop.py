"""Process-wide asyncio policy for the API."""

from __future__ import annotations

import asyncio
import sys


def install_windows_selector_event_loop() -> None:
    """Install SelectorEventLoop on Windows so psycopg async can connect.

    The default ProactorEventLoop rejects psycopg's wait callback.
    """
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
