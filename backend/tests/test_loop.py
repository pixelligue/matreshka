from __future__ import annotations

import asyncio
import sys

import pytest

from matreshka_api.loop import install_windows_selector_event_loop


def test_windows_uses_selector_event_loop_policy() -> None:
    if sys.platform != "win32":
        pytest.skip("WindowsSelectorEventLoopPolicy is Windows-only")
    install_windows_selector_event_loop()
    assert isinstance(
        asyncio.get_event_loop_policy(),
        asyncio.WindowsSelectorEventLoopPolicy,
    )
