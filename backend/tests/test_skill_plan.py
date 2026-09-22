"""Internal skill registry and the Jev-then-Flash plan route."""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import pytest
from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.auth import provision_user
from matreshka_api.main import create_app
from matreshka_api.openrouter import JEV_MODEL, OPENROUTER_DECISIONS_URL
from matreshka_api.settings import Settings
from matreshka_api.skill_registry import REGISTRY, skills_for_choice
from tests.conftest import make_settings

OPENROUTER_KEY = "sk-or-test-plan"


@dataclass
class PlanHarness:
    client: TestClient
    settings: Settings
    calls: list[httpx.Request] = field(default_factory=list)
    choice: str = "fastapi-expert"


def _harness(tmp_path: Path, *, openrouter_key: str | None = OPENROUTER_KEY) -> Iterator[PlanHarness]:
    settings = make_settings(tmp_path, openrouter_api_key=openrouter_key if openrouter_key is not None else "")
    state = PlanHarness(client=None, settings=settings)  # type: ignore[arg-type]

    def handler(request: httpx.Request) -> httpx.Response:
        state.calls.append(request)
        if str(request.url) == OPENROUTER_DECISIONS_URL:
            return httpx.Response(200, json={
                "answers": {"tool": {"choice": state.choice, "confidence": 0.9}},
                "usage": {"input_tokens": 40, "output_tokens": 4},
            })
        return httpx.Response(404, json={"detail": "unexpected"})

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app = create_app(settings=settings, redis_client=FakeAsyncRedis(decode_responses=True), http_client=http_client)
    with TestClient(app) as client:
        state.client = client
        yield state


@pytest.fixture
def plan_harness(tmp_path: Path) -> Iterator[PlanHarness]:
    yield from _harness(tmp_path)


def _token(harness: PlanHarness) -> str:
    provision_user("op@example.com", "secret", settings=harness.settings)
    response = harness.client.post(
        "/v1/auth/login",
        json={"email": "op@example.com", "password": "secret"},
    )
    assert response.status_code == 200
    return response.json()["token"]


def test_registry_includes_the_stack_skills() -> None:
    ids = {skill.id for skill in REGISTRY}
    assert {
        "frontend-design",
        "mcp-builder",
        "fastapi-expert",
        "django-expert",
        "nextjs",
        "tailwind",
        "nestjs-patterns",
        "expo-overview",
        "react-native-expert",
        "postgres-pro",
        "mysql",
        "bun",
    } <= ids
    chosen = skills_for_choice("fastapi-expert")
    assert [skill.id for skill in chosen] == ["fastapi-expert"]
    assert "Pydantic" in chosen[0].body
    assert skills_for_choice("none") == ()


def test_list_skills_requires_a_session(plan_harness: PlanHarness) -> None:
    assert plan_harness.client.get("/v1/skills").status_code == 401
    token = _token(plan_harness)
    listed = plan_harness.client.get("/v1/skills", headers={"Authorization": f"Bearer {token}"})
    assert listed.status_code == 200
    assert [row["id"] for row in listed.json()] == [skill.id for skill in REGISTRY]


def test_none_returns_no_skill(plan_harness: PlanHarness) -> None:
    plan_harness.choice = "none"
    token = _token(plan_harness)
    response = plan_harness.client.post(
        "/v1/skills/plan",
        headers={"Authorization": f"Bearer {token}"},
        json={"request": "напиши письмо клиенту"},
    )
    assert response.status_code == 200
    assert response.json()["skills"] == []
    assert [str(call.url) for call in plan_harness.calls] == [OPENROUTER_DECISIONS_URL]


def test_fastapi_choice_returns_the_published_skill(plan_harness: PlanHarness) -> None:
    token = _token(plan_harness)
    response = plan_harness.client.post(
        "/v1/skills/plan",
        headers={"Authorization": f"Bearer {token}"},
        json={"request": "сделай API на FastAPI"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["skills"][0]["id"] == "fastapi-expert"
    assert body["skills"][0]["body"].startswith("---")
    import json
    sent = json.loads(plan_harness.calls[0].content)
    assert sent["model"] == JEV_MODEL
    assert "fastapi-expert" in sent["questions"]["tool"]["criteria"]
