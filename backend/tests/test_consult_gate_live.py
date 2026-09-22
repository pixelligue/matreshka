"""Live Jev skip/proceed/consult gate: ordinary-operator prompts."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.test_consult_live import LIVE_KEY, _token, live_client, skip_without_key

pytestmark = pytest.mark.live

GATE_TAIL = (
    "\n\nChoose exactly one. skip: greeting, thanks, chit-chat, or a question with no task. "
    "proceed: one clear straightforward task (a simple letter, ad, search, or CRM create) with no conflict or reputation risk. "
    "consult: messy or conflicting facts, an apology, several asks, missing ids for a write, money or legal risk, or \"do not offend\"."
)

SKIP_CASES: list[tuple[str, str]] = [
    ("greeting-ru", "привет"),
    ("greeting-en", "hi"),
    ("thanks", "спасибо"),
    ("ambiguous", "это нормально?"),
]

PROCEED_CASES: list[tuple[str, str]] = [
    ("short-task", "напиши письмо клиенту что поставка задержится на два дня"),
    ("typo-short", "составь объявление на авито про диван почти новый"),
    ("plugin-crm", "создай в битриксе сделку на иванова на 40 тысяч"),
    ("search", "найди отели в сочи с 3 по 5 октября для двоих"),
]

CONSULT_CASES: list[tuple[str, str]] = [
    (
        "medium-email",
        "Перепиши это по-человечески, без канцелярита, чтобы не обидеть клиента: "
        "Уважаемый контрагент, в связи с возникновением форс-мажорных обстоятельств "
        "отгрузка по счёту 4412 будет осуществлена с отклонением от графика на 4 рабочих дня. "
        "Просим принять к сведению.",
    ),
    (
        "long-messy",
        "слушай короче у нас менеджер напутал и клиенту ушло письмо что заказ уже в пути "
        "а на складе его нет вообще, они звонят орют, директор просит чтобы я за 10 минут "
        "написал нормальный ответ: извиниться, сказать правду без воды, предложить скидку 5% "
        "или доставку за наш счёт, и чтобы это не выглядело как признание что мы всегда так работаем. "
        "ещё не забудь что они из казани и любят на вы.",
    ),
]


def _goal(prompt: str) -> str:
    return f"User request:\n{prompt}{GATE_TAIL}"


def _select(client: TestClient, token: str, prompt: str) -> dict[str, object]:
    response = client.post(
        "/v1/tools/select",
        headers={"Authorization": f"Bearer {token}"},
        json={"goal": _goal(prompt), "candidates": ["skip", "proceed", "consult"]},
    )
    assert response.status_code == 200, response.text
    assert "sk-or-" not in response.text
    body = response.json()
    assert body["tool"] in {"skip", "proceed", "consult"}
    return body


@skip_without_key
@pytest.mark.parametrize(("label", "prompt"), SKIP_CASES, ids=[c[0] for c in SKIP_CASES])
def test_live_jev_skips_chit_chat(
    live_client: TestClient, tmp_path, label: str, prompt: str
) -> None:
    token = _token(live_client, tmp_path)
    body = _select(live_client, token, prompt)
    print(f"{label}\t{body['tool']}\t{body.get('confidence')}\t{prompt!r}")
    assert body["tool"] == "skip", f"{label} should skip: {body}"


@skip_without_key
@pytest.mark.parametrize(("label", "prompt"), PROCEED_CASES, ids=[c[0] for c in PROCEED_CASES])
def test_live_jev_proceeds_on_simple_tasks(
    live_client: TestClient, tmp_path, label: str, prompt: str
) -> None:
    token = _token(live_client, tmp_path)
    body = _select(live_client, token, prompt)
    print(f"{label}\t{body['tool']}\t{body.get('confidence')}\t{prompt[:80]!r}")
    assert body["tool"] == "proceed", f"{label} should proceed: {body}"


@skip_without_key
@pytest.mark.parametrize(("label", "prompt"), CONSULT_CASES, ids=[c[0] for c in CONSULT_CASES])
def test_live_jev_consults_hard_tasks(
    live_client: TestClient, tmp_path, label: str, prompt: str
) -> None:
    token = _token(live_client, tmp_path)
    body = _select(live_client, token, prompt)
    print(f"{label}\t{body['tool']}\t{body.get('confidence')}\t{prompt[:80]!r}")
    assert body["tool"] == "consult", f"{label} should consult: {body}"


@skip_without_key
def test_live_flash_verdict_on_a_hard_task(live_client: TestClient, tmp_path) -> None:
    token = _token(live_client, tmp_path)
    prompt = CONSULT_CASES[0][1]
    select = _select(live_client, token, prompt)
    assert select["tool"] == "consult"
    last = None
    for _attempt in range(2):
        last = live_client.post(
            "/v1/consult",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "goal": prompt[:4000],
                "question": "How should the agent handle this user request?",
                "plan": "Complete the request with available tools, without inventing facts or sending anything the user did not ask to send.",
            },
        )
        if last.status_code == 200:
            break
    assert last is not None
    if last.status_code != 200:
        pytest.fail(f"Flash consult HTTP {last.status_code}: {last.text[:300]}")
    body = last.json()
    assert body["verdict"] in {"ok", "revise", "risk"}
    assert isinstance(body["detail"], str) and body["detail"]
    assert "sk-or-" not in last.text
    print(f"flash\t{body['verdict']}\t{body['detail'][:160]!r}")
