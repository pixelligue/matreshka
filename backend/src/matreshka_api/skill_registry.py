"""Published development skills stored on the API. Jev picks one by its description."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RegistrySkill:
    """One published SKILL.md. `body` is the file text, including frontmatter."""

    id: str
    summary: str
    body: str


ROOT = Path(__file__).parent / "skills"
NONE_SKILL = "none"


def _summary(text: str) -> tuple[str, str]:
    if not text.startswith("---"):
        raise ValueError("skill file has no frontmatter")
    end = text.find("\n---", 3)
    if end < 0:
        raise ValueError("skill frontmatter does not close")
    name = ""
    description = ""
    for line in text[4:end].splitlines():
        if line.startswith("name:"):
            name = line.split(":", 1)[1].strip().strip("\"'")
        elif line.startswith("description:"):
            description = line.split(":", 1)[1].strip().strip("\"'")
    if name == "":
        raise ValueError("skill frontmatter has no name")
    return name, description[:240]


def load_registry() -> tuple[RegistrySkill, ...]:
    """Read every `skills/<id>/SKILL.md` shipped with the API."""
    found: list[RegistrySkill] = []
    for path in sorted(ROOT.glob("*/SKILL.md")):
        text = path.read_text(encoding="utf-8")
        name, summary = _summary(text)
        found.append(RegistrySkill(id=name, summary=summary, body=text))
    return tuple(found)


REGISTRY: tuple[RegistrySkill, ...] = load_registry()
_BY_ID = {skill.id: skill for skill in REGISTRY}


def skill_by_id(skill_id: str) -> RegistrySkill | None:
    """Return one registry skill, or None when the id is not stored."""
    return _BY_ID.get(skill_id)


def skills_for_choice(choice: str) -> tuple[RegistrySkill, ...]:
    """The skill Jev chose, or an empty tuple for ``none`` and unknown ids."""
    skill = skill_by_id(choice)
    if skill is None:
        return ()
    return (skill,)


def jev_skill_criteria() -> dict[str, str]:
    """Criteria Jev uses to choose a skill or ``none``."""
    criteria = {
        NONE_SKILL: (
            "The request does not need a stack skill: a greeting, a letter, a search, "
            "or a task that names none of these frameworks, databases, or UI jobs."
        ),
    }
    for skill in REGISTRY:
        criteria[skill.id] = skill.summary or skill.id
    return criteria
