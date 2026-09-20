"""Private, metadata-only accounting for upstream operations."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from matreshka_api.auth import CurrentUserDep
from matreshka_api.db import SessionDep
from matreshka_api.models import UsageEvent
from matreshka_api.usage_analytics import UsageAnalytics

router = APIRouter(prefix="/v1/usage", tags=["usage"])
logger = logging.getLogger("matreshka.usage")
MAX_DB_INTEGER = 2**63 - 1


@dataclass(frozen=True)
class TokenCounts:
    input_tokens: int | None = None
    output_tokens: int | None = None


@dataclass(frozen=True)
class Charge:
    amount_nanos: int
    currency: str
    source: str


@dataclass(frozen=True)
class UsageObservation:
    operation: str
    provider: str
    status: str
    model: str | None = None
    tokens: TokenCounts = TokenCounts()
    charge: Charge | None = None
    request_bytes: int | None = None
    tool_schema_bytes: int | None = None
    tool_count: int | None = None
    result_bytes: int | None = None
    result_count: int | None = None
    provider_request_id: str | None = None


def _nonnegative_int(value: object) -> int | None:
    return value if type(value) is int and 0 <= value <= MAX_DB_INTEGER else None


def _usage(payload: object) -> dict[str, object]:
    if not isinstance(payload, dict):
        return {}
    value = payload.get("usage")
    return value if isinstance(value, dict) else {}


def token_counts(payload: object) -> TokenCounts:
    """Read token counts without treating missing provider fields as zero."""
    raw = _usage(payload)
    return TokenCounts(
        input_tokens=_nonnegative_int(raw.get("prompt_tokens", raw.get("input_tokens"))),
        output_tokens=_nonnegative_int(raw.get("completion_tokens", raw.get("output_tokens"))),
    )


def llmtokenapi_charge(payload: object) -> Charge | None:
    """Use the provider's charged kopecks only when the response includes them."""
    kopecks = _nonnegative_int(_usage(payload).get("charged_kopecks"))
    return (
        None if kopecks is None or kopecks > MAX_DB_INTEGER // 10_000_000
        else Charge(kopecks * 10_000_000, "RUB", "reported")
    )


def openrouter_charge(payload: object, estimated_usd: float | None) -> Charge | None:
    """Prefer reported USD cost; label the built-in rate fallback as an estimate."""
    raw_cost = _usage(payload).get("cost")
    source = "reported" if raw_cost is not None else "rate_estimate"
    value = raw_cost if raw_cost is not None else estimated_usd
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        return None
    try:
        amount = Decimal(str(value))
    except InvalidOperation:
        return None
    if not amount.is_finite() or amount < 0:
        return None
    try:
        nanos = int((amount * 1_000_000_000).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    except (InvalidOperation, OverflowError, ValueError):
        return None
    if nanos > MAX_DB_INTEGER:
        return None
    return Charge(nanos, "USD", source)


def provider_request_id(payload: object) -> str | None:
    """Keep an opaque generation ID for later invoice reconciliation."""
    if not isinstance(payload, dict):
        return None
    value = payload.get("id")
    return value if isinstance(value, str) and len(value) <= 200 else None


async def record_usage(
    engine: AsyncEngine,
    user_id: int,
    observation: UsageObservation,
    analytics: UsageAnalytics | None = None,
) -> None:
    """Persist one observation; accounting failure does not alter the upstream response."""
    row = UsageEvent(
        user_id=user_id,
        operation=observation.operation,
        provider=observation.provider,
        model=observation.model,
        status=observation.status,
        input_tokens=observation.tokens.input_tokens,
        output_tokens=observation.tokens.output_tokens,
        amount_nanos=observation.charge.amount_nanos if observation.charge else None,
        currency=observation.charge.currency if observation.charge else None,
        amount_source=observation.charge.source if observation.charge else None,
        request_bytes=observation.request_bytes,
        tool_schema_bytes=observation.tool_schema_bytes,
        tool_count=observation.tool_count,
        result_bytes=observation.result_bytes,
        result_count=observation.result_count,
        provider_request_id=observation.provider_request_id,
    )
    try:
        async with AsyncSession(engine, expire_on_commit=False) as session:
            session.add(row)
            await session.commit()
    except Exception as error:
        logger.error("usage record failed: %s", type(error).__name__)
        return
    if analytics is not None:
        analytics.publish(row)


class UsageSummaryRow(BaseModel):
    operation: str
    provider: str
    model: str | None
    status: str
    currency: str | None
    amount_source: str | None
    requests: int
    metered_requests: int
    input_tokens: int
    output_tokens: int
    amount_nanos: int | None
    request_bytes: int
    tool_schema_bytes: int
    result_bytes: int


class UsageSummaryResponse(BaseModel):
    rows: list[UsageSummaryRow]


class UsageReportRow(BaseModel):
    day: date
    operation: str
    provider: str
    model: str | None
    status: str
    currency: str | None
    amount_source: str | None
    requests: int
    metered_requests: int
    input_tokens: int
    output_tokens: int
    amount_nanos: int | None


class UsageReportResponse(BaseModel):
    from_day: date
    through_day: date
    rows: list[UsageReportRow]


@router.get("/report")
async def usage_report(
    _user: CurrentUserDep,
    session: SessionDep,
    days: Annotated[int, Query(ge=1, le=365)] = 30,
) -> UsageReportResponse:
    """Return daily user-scoped totals with currencies and cost sources separate."""
    through_day = datetime.now(timezone.utc).date()
    from_day = through_day - timedelta(days=days - 1)
    start = datetime.combine(from_day, time.min, tzinfo=timezone.utc)
    end = datetime.combine(through_day + timedelta(days=1), time.min, tzinfo=timezone.utc)
    day = func.date(UsageEvent.occurred_at)
    statement = (
        select(
            day,
            UsageEvent.operation,
            UsageEvent.provider,
            UsageEvent.model,
            UsageEvent.status,
            UsageEvent.currency,
            UsageEvent.amount_source,
            func.count(UsageEvent.id),
            func.count(UsageEvent.input_tokens),
            func.sum(UsageEvent.input_tokens),
            func.sum(UsageEvent.output_tokens),
            func.sum(UsageEvent.amount_nanos),
        )
        .where(UsageEvent.user_id == _user.id, UsageEvent.occurred_at >= start, UsageEvent.occurred_at < end)
        .group_by(
            day, UsageEvent.operation, UsageEvent.provider, UsageEvent.model,
            UsageEvent.status, UsageEvent.currency, UsageEvent.amount_source,
        )
        .order_by(day.desc())
    )
    result = await session.exec(statement)
    rows = [
        UsageReportRow(
            day=date.fromisoformat(str(day_value)), operation=operation,
            provider=provider, model=model, status=status, currency=currency,
            amount_source=amount_source, requests=requests,
            metered_requests=metered_requests, input_tokens=input_tokens or 0,
            output_tokens=output_tokens or 0, amount_nanos=amount_nanos,
        )
        for (day_value, operation, provider, model, status, currency,
             amount_source, requests, metered_requests, input_tokens,
             output_tokens, amount_nanos) in result.all()
    ]
    return UsageReportResponse(from_day=from_day, through_day=through_day, rows=rows)


@router.get("/summary")
async def usage_summary(_user: CurrentUserDep, session: SessionDep) -> UsageSummaryResponse:
    """Group the signed-in user's observations without mixing currencies or estimates."""
    statement = (
        select(
            UsageEvent.operation,
            UsageEvent.provider,
            UsageEvent.model,
            UsageEvent.status,
            UsageEvent.currency,
            UsageEvent.amount_source,
            func.count(UsageEvent.id),
            func.count(UsageEvent.input_tokens),
            func.sum(UsageEvent.input_tokens),
            func.sum(UsageEvent.output_tokens),
            func.sum(UsageEvent.amount_nanos),
            func.sum(UsageEvent.request_bytes),
            func.sum(UsageEvent.tool_schema_bytes),
            func.sum(UsageEvent.result_bytes),
        )
        .where(UsageEvent.user_id == _user.id)
        .group_by(
            UsageEvent.operation,
            UsageEvent.provider,
            UsageEvent.model,
            UsageEvent.status,
            UsageEvent.currency,
            UsageEvent.amount_source,
        )
    )
    result = await session.exec(statement)
    return UsageSummaryResponse(rows=[
        UsageSummaryRow(
            operation=operation, provider=provider, model=model, status=status,
            currency=currency, amount_source=amount_source, requests=requests,
            metered_requests=metered_requests, input_tokens=input_tokens or 0,
            output_tokens=output_tokens or 0, amount_nanos=amount_nanos,
            request_bytes=request_bytes or 0, tool_schema_bytes=tool_schema_bytes or 0,
            result_bytes=result_bytes or 0,
        )
        for (operation, provider, model, status, currency, amount_source, requests,
             metered_requests, input_tokens, output_tokens, amount_nanos,
             request_bytes, tool_schema_bytes, result_bytes) in result.all()
    ])


@router.get("/events")
async def usage_events(
    _user: CurrentUserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[UsageEvent]:
    """Return recent usage metadata for the signed-in user, newest first."""
    result = await session.exec(
        select(UsageEvent)
        .where(UsageEvent.user_id == _user.id)
        .order_by(UsageEvent.id.desc())  # type: ignore[union-attr]
        .limit(limit)
    )
    return list(result.all())
