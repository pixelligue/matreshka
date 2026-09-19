"""Amadeus Self-Service hotel list and offers via product credentials."""

from __future__ import annotations

import re
import time
import httpx
from fastapi import HTTPException

from matreshka_api.settings import Settings

AMADEUS_TEST_HOST = "test.api.amadeus.com"
AMADEUS_PROD_HOST = "api.amadeus.com"
ALLOWED_HOSTS = frozenset({AMADEUS_TEST_HOST, AMADEUS_PROD_HOST})
CITY_CODE = re.compile(r"^[A-Z]{3}$")
HOTEL_IDS = re.compile(r"^[A-Z0-9]{8}(,[A-Z0-9]{8}){0,19}$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
LAT_LON = re.compile(r"^-?\d{1,3}(\.\d{1,8})?$")

_token_cache: dict[str, tuple[str, float]] = {}


def amadeus_configured(settings: Settings) -> bool:
    """Return whether product Amadeus credentials are present.
    @param settings: process settings.
    """
    return bool(settings.amadeus_client_id and settings.amadeus_client_secret)


def amadeus_host(settings: Settings) -> str:
    host = (settings.amadeus_hostname or AMADEUS_TEST_HOST).strip().lower()
    if host not in ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail="invalid Amadeus hostname")
    return host


def reset_token_cache() -> None:
    """Drop cached OAuth tokens (tests)."""
    _token_cache.clear()


async def amadeus_access_token(http_client: httpx.AsyncClient, settings: Settings) -> str:
    if not amadeus_configured(settings):
        raise HTTPException(status_code=503, detail="Amadeus is not configured")
    client_id = settings.amadeus_client_id or ""
    cached = _token_cache.get(client_id)
    now = time.monotonic()
    if cached is not None and cached[1] > now + 30:
        return cached[0]
    response = await http_client.post(
        f"https://{amadeus_host(settings)}/v1/security/oauth2/token",
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": settings.amadeus_client_secret or "",
        },
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Upstream error")
    payload = response.json()
    token = payload.get("access_token") if isinstance(payload, dict) else None
    expires = payload.get("expires_in") if isinstance(payload, dict) else None
    if not isinstance(token, str) or not token:
        raise HTTPException(status_code=502, detail="Upstream error")
    ttl = expires if isinstance(expires, int) and expires > 60 else 1799
    _token_cache[client_id] = (token, now + ttl)
    return token


def amadeus_url(path: str, query: dict[str, str], settings: Settings) -> tuple[str, dict[str, str]]:
    host = amadeus_host(settings)
    if path == "hotels/by-city":
        city = query.get("cityCode", "").strip().upper()
        if not CITY_CODE.fullmatch(city):
            raise HTTPException(status_code=400, detail="cityCode is required")
        params = {"cityCode": city}
        _copy_optional(query, params, ("radius", "radiusUnit", "hotelSource"))
        return f"https://{host}/v1/reference-data/locations/hotels/by-city", params
    if path == "hotels/by-geocode":
        lat = query.get("latitude", "").strip()
        lon = query.get("longitude", "").strip()
        if not LAT_LON.fullmatch(lat) or not LAT_LON.fullmatch(lon):
            raise HTTPException(status_code=400, detail="latitude and longitude are required")
        params = {"latitude": lat, "longitude": lon}
        _copy_optional(query, params, ("radius", "radiusUnit", "hotelSource"))
        return f"https://{host}/v1/reference-data/locations/hotels/by-geocode", params
    if path == "hotel-offers":
        ids = query.get("hotelIds", "").strip().upper()
        if not HOTEL_IDS.fullmatch(ids):
            raise HTTPException(status_code=400, detail="hotelIds is required")
        params = {"hotelIds": ids}
        check_in = query.get("checkInDate", "").strip()
        check_out = query.get("checkOutDate", "").strip()
        if check_in and not ISO_DATE.fullmatch(check_in):
            raise HTTPException(status_code=400, detail="invalid checkInDate")
        if check_out and not ISO_DATE.fullmatch(check_out):
            raise HTTPException(status_code=400, detail="invalid checkOutDate")
        if check_in:
            params["checkInDate"] = check_in
        if check_out:
            params["checkOutDate"] = check_out
        _copy_optional(query, params, ("adults", "roomQuantity", "currency", "bestRateOnly"))
        return f"https://{host}/v3/shopping/hotel-offers", params
    raise HTTPException(status_code=400, detail="path is not allowed")


def _copy_optional(source: dict[str, str], dest: dict[str, str], keys: tuple[str, ...]) -> None:
    for key in keys:
        value = source.get(key, "").strip()
        if value:
            dest[key] = value
