"""Token validity check — ``auth.test`` decides Mint-vs-reuse.

A Valid token is one ``auth.test`` confirms still works (CONTEXT.md). This is the
probe ``slack-login`` runs after a Mint to confirm the freshly stored token is good,
and the same check ``slack-upload`` will use to decide whether to reuse the stored
token or drive a new Login.

Integration-shaped: it wraps Slack's HTTP API, so it is covered by manual/acceptance
verification rather than unit tests asserting against a mock of someone else's API
(per the PRD's testing decisions). Implemented with the stdlib so the Skill keeps no
dependency just to probe a token.
"""

from __future__ import annotations

import json
import urllib.request
from typing import Callable


def auth_test(token: str, *, urlopen: Callable = urllib.request.urlopen) -> dict:
    """Call Slack ``auth.test`` with ``token`` and return the parsed response."""
    req = urllib.request.Request(
        "https://slack.com/api/auth.test",
        headers={"Authorization": f"Bearer {token}"},
        method="POST",
    )
    with urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def is_valid(token: str, *, urlopen: Callable = urllib.request.urlopen) -> bool:
    """Return whether ``auth.test`` confirms ``token`` still works."""
    try:
        return bool(auth_test(token, urlopen=urlopen).get("ok"))
    except OSError:
        return False
