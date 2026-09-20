"""Best-effort Aptabase projection of persisted usage metadata."""

from __future__ import annotations

import asyncio
import logging
import platform
import secrets
from datetime import datetime, timezone

import httpx

from matreshka_api.models import UsageEvent

logger = logging.getLogger("matreshka.usage_analytics")
MAX_PENDING_EVENTS = 256


class UsageAnalytics:
    """Send anonymous usage events to a separate self-hosted Aptabase app."""

    def __init__(self, client: httpx.AsyncClient, app_key: str | None, host: str) -> None:
        self.client = client
        self.app_key = app_key
        self.host = host
        self.pending: set[asyncio.Task[None]] = set()
        self.session_id = f"{int(datetime.now(timezone.utc).timestamp())}{secrets.randbelow(100_000_000):08d}"

    def publish(self, row: UsageEvent) -> None:
        """Queue one event after its authoritative database row commits."""
        if self.app_key is None:
            return
        if len(self.pending) >= MAX_PENDING_EVENTS:
            logger.warning("usage analytics queue full")
            return
        task = asyncio.create_task(self._send(row))
        self.pending.add(task)
        task.add_done_callback(self.pending.discard)

    async def _send(self, row: UsageEvent) -> None:
        props: dict[str, str | int] = {
            "operation": row.operation,
            "provider": row.provider,
            "status": row.status,
        }
        optional: dict[str, str | int | None] = {
            "model": row.model,
            "currency": row.currency,
            "amount_source": row.amount_source,
            "amount_nanos": row.amount_nanos,
            "input_tokens": row.input_tokens,
            "output_tokens": row.output_tokens,
            "request_bytes": row.request_bytes,
            "tool_schema_bytes": row.tool_schema_bytes,
            "result_bytes": row.result_bytes,
        }
        props.update({key: value for key, value in optional.items() if value is not None})
        occurred = row.occurred_at.replace(tzinfo=timezone.utc) if row.occurred_at.tzinfo is None else row.occurred_at
        system = platform.system()
        os_name = "macOS" if system == "Darwin" else system if system in {"Windows", "Linux"} else "Linux"
        body = {
            "timestamp": occurred.isoformat().replace("+00:00", "Z"),
            "sessionId": self.session_id,
            "eventName": "upstream_usage",
            "systemProps": {
                "isDebug": False,
                "locale": "en",
                "osName": os_name,
                "osVersion": platform.release(),
                "appVersion": "0.1.0",
                "sdkVersion": "matreshka-api@0.1.0",
            },
            "props": props,
        }
        try:
            response = await self.client.post(
                f"{self.host}/api/v0/event",
                headers={"App-Key": self.app_key or ""},
                json=body,
                timeout=2.0,
            )
            response.raise_for_status()
        except (httpx.HTTPError, ValueError) as error:
            logger.warning("usage analytics delivery failed: %s", type(error).__name__)

    async def close(self) -> None:
        """Bound shutdown while letting queued telemetry complete when possible."""
        if not self.pending:
            return
        tasks = tuple(self.pending)
        _, pending = await asyncio.wait(tasks, timeout=3.0)
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
