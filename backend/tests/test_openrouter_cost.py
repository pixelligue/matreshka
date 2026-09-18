"""List-price estimates for small vs large consult and Jev select calls."""

from __future__ import annotations

from matreshka_api.openrouter import (
    CONSULT_MAX_BYTES,
    FLASH_MODEL,
    JEV_MODEL,
    SELECT_MAX_BYTES,
    estimate_usd,
)


def test_flash_small_consult_is_fractions_of_a_cent() -> None:
    # Typical consult: short goal/question, ~400 in / 40 out.
    usd = estimate_usd(FLASH_MODEL, 400, 40)
    assert 0 < usd < 0.0002


def test_flash_near_cap_consult_stays_under_a_cent() -> None:
    # 32_000 UTF-8 bytes is roughly 8k tokens; max_tokens is 256.
    usd = estimate_usd(FLASH_MODEL, 8_000, 256)
    assert usd < 0.01
    assert CONSULT_MAX_BYTES == 32_000


def test_jev_select_is_cheaper_than_the_same_size_flash_call() -> None:
    jev = estimate_usd(JEV_MODEL, 2_000, 40)
    flash = estimate_usd(FLASH_MODEL, 2_000, 40)
    assert jev < flash
    assert jev < 0.0001
    assert SELECT_MAX_BYTES == 16_000


def test_jev_near_cap_select_is_still_tiny() -> None:
    usd = estimate_usd(JEV_MODEL, 4_000, 20)
    assert usd < 0.0002
