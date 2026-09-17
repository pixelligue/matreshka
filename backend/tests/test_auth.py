from __future__ import annotations

import asyncio

import pytest
from sqlmodel import Session, select

from matreshka_api.auth import UserAlreadyExistsError, provision_user, session_key
from matreshka_api.cli import main
from matreshka_api.db import create_sync_engine
from matreshka_api.models import User
from matreshka_api.settings import sync_database_url
from tests.conftest import AppHarness

CHAT_BODY = {
    "model": "matrena",
    "messages": [{"role": "user", "content": "hi"}],
    "stream": True,
}


def test_cli_create_user_and_duplicate_fails(
    harness: AppHarness, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("DATABASE_URL", harness.settings.database_url)
    monkeypatch.setenv("REDIS_URL", harness.settings.redis_url)

    main(["create-user", "--email", "op@example.com", "--password", "secret"])
    engine = create_sync_engine(sync_database_url(harness.settings.database_url))
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "op@example.com")).first()
    assert user is not None
    assert user.email == "op@example.com"
    assert user.password_hash != "secret"

    with pytest.raises(UserAlreadyExistsError):
        provision_user("op@example.com", "secret", settings=harness.settings)

    with pytest.raises(SystemExit) as exc:
        main(["create-user", "--email", "op@example.com", "--password", "secret"])
    assert exc.value.code != 0


def test_cli_prompts_for_password_when_flag_omitted(
    harness: AppHarness, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("DATABASE_URL", harness.settings.database_url)
    monkeypatch.setenv("REDIS_URL", harness.settings.redis_url)
    monkeypatch.setattr("matreshka_api.cli.getpass.getpass", lambda _prompt: "secret")
    main(["create-user", "--email", "prompt@example.com"])
    engine = create_sync_engine(sync_database_url(harness.settings.database_url))
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "prompt@example.com")).first()
    assert user is not None


def test_login_valid_credentials_returns_token(harness: AppHarness) -> None:
    provision_user("op@example.com", "secret", settings=harness.settings)
    response = harness.client.post(
        "/v1/auth/login",
        json={"email": "op@example.com", "password": "secret"},
    )
    assert response.status_code == 200
    token = response.json()["token"]
    assert isinstance(token, str) and token


def test_login_unknown_email_or_wrong_password_is_401_without_session(
    harness: AppHarness,
) -> None:
    provision_user("op@example.com", "secret", settings=harness.settings)
    unknown = harness.client.post(
        "/v1/auth/login",
        json={"email": "missing@example.com", "password": "secret"},
    )
    wrong = harness.client.post(
        "/v1/auth/login",
        json={"email": "op@example.com", "password": "wrong"},
    )
    assert unknown.status_code == 401
    assert wrong.status_code == 401
    assert unknown.json()["detail"] == wrong.json()["detail"]
    keys = asyncio.run(harness.redis.keys("session:*"))
    assert list(keys) == []


def test_protected_route_requires_bearer_and_revoking_redis_key_unauthorizes(
    harness: AppHarness,
) -> None:
    provision_user("op@example.com", "secret", settings=harness.settings)
    login = harness.client.post(
        "/v1/auth/login",
        json={"email": "op@example.com", "password": "secret"},
    )
    token = login.json()["token"]
    ttl = asyncio.run(harness.redis.ttl(session_key(token)))
    assert ttl > 0
    assert ttl <= harness.settings.session_ttl_seconds

    missing = harness.client.post("/v1/chat/completions", json=CHAT_BODY)
    assert missing.status_code == 401

    unknown = harness.client.post(
        "/v1/chat/completions",
        json=CHAT_BODY,
        headers={"Authorization": "Bearer nosuchtoken"},
    )
    assert unknown.status_code == 401

    malformed = harness.client.post(
        "/v1/chat/completions",
        json=CHAT_BODY,
        headers={"Authorization": "Basic abc"},
    )
    assert malformed.status_code == 401

    ok = harness.client.post(
        "/v1/chat/completions",
        json=CHAT_BODY,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ok.status_code == 200

    asyncio.run(harness.redis.delete(session_key(token)))
    revoked = harness.client.post(
        "/v1/chat/completions",
        json=CHAT_BODY,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert revoked.status_code == 401


def test_logout_revokes_token(harness: AppHarness) -> None:
    provision_user("op@example.com", "secret", settings=harness.settings)
    login = harness.client.post(
        "/v1/auth/login",
        json={"email": "op@example.com", "password": "secret"},
    )
    token = login.json()["token"]
    gone = harness.client.post(
        "/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert gone.status_code == 204
    assert gone.text == ""
    reused = harness.client.post(
        "/v1/chat/completions",
        json=CHAT_BODY,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert reused.status_code == 401


def test_logout_without_authorization_is_204(harness: AppHarness) -> None:
    response = harness.client.post("/v1/auth/logout")
    assert response.status_code == 204


def test_register_route_is_missing(harness: AppHarness) -> None:
    response = harness.client.post(
        "/v1/auth/register",
        json={"email": "new@example.com", "password": "secret"},
    )
    assert response.status_code in (404, 405)
