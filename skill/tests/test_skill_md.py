"""SKILL.md is the Skill's installable face and the Agent's process guide.

These tests guard the two things an automated check *can* hold steady about a
prose artifact whose real proof is an Agent following it (the HITL acceptance
test): that ``npx skills`` can install it (valid frontmatter), and that the
process it documents stays true to the Skill it ships — the utilities it names
and how they're invoked match the real console_scripts, so the guide can't drift
away from the code. The wording itself is curated by a human.
"""

import re
import tomllib
from pathlib import Path

import yaml

# The dev/test workspace; the installable Skill is a clean subdirectory of it.
WORKSPACE = Path(__file__).resolve().parent.parent
SKILL_DIR = WORKSPACE / "slack-file-upload"
SKILL_MD = SKILL_DIR / "SKILL.md"
SCRIPTS_DIR = SKILL_DIR / "scripts"


def _split_frontmatter(text: str) -> tuple[dict, str]:
    """Split a SKILL.md into its YAML frontmatter (as a dict) and its body.

    Parses the frontmatter with a real YAML loader — the same way ``npx skills``
    does — so a scalar a hand-rolled splitter would tolerate (e.g. an unquoted
    ``: `` mid-description) fails here instead of at install time.
    """
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.DOTALL)
    assert match, "SKILL.md must open with a --- delimited YAML frontmatter block"
    front = yaml.safe_load(match.group(1))
    assert isinstance(front, dict), "frontmatter must parse to a YAML mapping"
    return front, match.group(2)


def test_frontmatter_names_the_skill_for_npx_install():
    front, _ = _split_frontmatter(SKILL_MD.read_text())

    # `npx skills` installs by this identifier and surfaces the description to the
    # Agent; the name must match the package the landing page tells users to install.
    assert front["name"] == "slack-file-upload"


def test_name_matches_the_skill_directory_per_spec():
    front, _ = _split_frontmatter(SKILL_MD.read_text())

    # agentskills.io spec: the `name` field must match the parent directory name, so
    # an installer copying `<name>/` lands the Skill where its own metadata says it is.
    assert front["name"] == SKILL_DIR.name


def test_skill_directory_is_clean_for_npx_install():
    # The installable Skill must carry only what it ships — SKILL.md plus scripts/ —
    # not the dev/test tooling. Build config and the test suite live up in the
    # workspace, so `npx skills` copies a clean, self-contained directory.
    present = {p.name for p in SKILL_DIR.iterdir() if not p.name.startswith(".")}
    assert present <= {"SKILL.md", "scripts", "references", "assets"}, (
        f"unexpected dev tooling inside the installable Skill: {present}"
    )


def test_description_advertises_the_capability_for_unprompted_discovery():
    front, _ = _split_frontmatter(SKILL_MD.read_text())
    description = front["description"]

    # The description is the only thing an Agent sees when deciding to reach for the
    # Skill (write-a-skill): it must fit the surfaced budget, and carry both the
    # capability (upload a file to Slack as the user) and trigger language.
    assert 0 < len(description) <= 1024
    lowered = description.lower()
    for capability_term in ("slack", "upload", "file"):
        assert capability_term in lowered, f"description must advertise {capability_term!r}"
    # write-a-skill: the second sentence tells the Agent *when* to trigger.
    assert "use when" in lowered


def _body_lower() -> str:
    _, body = _split_frontmatter(SKILL_MD.read_text())
    return body.lower()


def _section(title: str) -> str:
    """Return the body of the named ``## `` section, lowercased.

    Scopes order assertions to the step-by-step Workflow, so naming a utility in the
    overview doesn't count as walking the Agent through it.
    """
    body = _body_lower()
    match = re.search(rf"^##\s+{title.lower()}\s*$(.*?)(?=^##\s|\Z)", body, re.DOTALL | re.MULTILINE)
    assert match, f"SKILL.md must have a '## {title}' section"
    return match.group(1)


def test_workflow_covers_every_step_of_the_cold_start_spine():
    workflow = _section("Workflow")

    # The acceptance criterion: the Workflow walks the Agent through the whole spine —
    # detect a Valid token, guide the one-time install + Authorize, run the Login that
    # Mints and stores, and Upload. Coverage (not first-occurrence order) is the
    # robust guarantee here: good prose cross-references steps (the detect step's
    # failure message names `slack-login`), and whether the order *reads* right is
    # what the human/HITL acceptance test — an Agent actually following it — verifies.
    for landmark in ("valid token", "install", "authori", "slack-login", "slack-upload"):
        assert landmark in workflow, f"the Workflow must walk through {landmark!r}"


def test_documents_the_real_bundled_scripts_so_the_guide_cannot_drift():
    scripts = tomllib.loads((WORKSPACE / "pyproject.toml").read_text())["project"]["scripts"]
    body = _body_lower()

    # Every command the Skill actually ships must be the command the guide tells the
    # Agent to run. Sourcing the names from pyproject means renaming an entry point
    # without updating SKILL.md (or the bundled wrapper) fails here instead of
    # misleading an Agent at runtime.
    assert set(scripts) == {"slack-login", "slack-upload"}
    for command in scripts:
        # The bundled, install-free entry point an Agent actually runs.
        wrapper = SCRIPTS_DIR / command
        assert wrapper.exists(), f"missing bundled wrapper scripts/{command}"
        assert command in body, f"SKILL.md must tell the Agent to run {command!r}"

    # The documented invocation must be the bundled `scripts/…` form (no pip install),
    # and `slack-upload`'s must match its real CLI: a file PATH plus the optional
    # --conversation that selects direct vs handle-only upload.
    assert "scripts/slack-upload path" in body
    assert "scripts/slack-login" in body
    assert "--conversation" in body


def test_documents_the_token_already_present_short_circuit():
    workflow = _section("Workflow")

    # Acceptance criterion: when a Valid token already exists, the Agent skips the
    # whole auth flow. The guide must present the Login/Authorize path as a *fallback*
    # gated on a missing-or-invalid token — not an unconditional step — so an Agent
    # with a working token goes straight to a successful Upload and stops there.
    assert "fallback" in workflow
    assert re.search(r"token is missing or invalid", workflow), (
        "the Login flow must be gated on the token being missing or invalid"
    )
