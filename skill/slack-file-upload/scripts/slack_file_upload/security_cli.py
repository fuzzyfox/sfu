"""Thin wrapper over the macOS `security` CLI.

The Token Store reads and writes the Keychain by shelling out to `security`
rather than via the `keyring` library, so reads inherit the writing binary's
ACL and never trigger a GUI prompt (ADR-0003). This module is that seam; the
full Token Store resolution (Keychain-first, env-var fallback) builds on it.
"""

from __future__ import annotations

import subprocess

# `security` exit code for errSecInteractionNotAllowed — a locked Keychain or a
# non-GUI (SSH/cron) session where no unlock prompt can be shown.
_INTERACTION_NOT_ALLOWED = 51


class KeychainUnavailable(Exception):
    """The Keychain could not be reached (locked, or no GUI session).

    Distinct from a missing item: the item's presence is simply unknown.
    """


def read_password(
    service: str,
    account: str,
    *,
    security_bin: str = "security",
) -> str | None:
    """Return the generic-password secret for ``service``/``account``.

    Returns ``None`` when no matching Keychain item exists. Raises
    ``KeychainUnavailable`` when the Keychain itself can't be reached (locked or
    no GUI session) — a state in which the item's presence is unknown.
    ``security_bin`` is the binary to invoke, resolved on ``PATH`` (overridable
    for tests).
    """
    result = subprocess.run(
        [security_bin, "find-generic-password", "-s", service, "-a", account, "-w"],
        capture_output=True,
        text=True,
    )
    if result.returncode == _INTERACTION_NOT_ALLOWED:
        raise KeychainUnavailable(result.stderr.strip())
    if result.returncode != 0:
        return None
    return result.stdout.rstrip("\n")


def write_password(
    service: str,
    account: str,
    secret: str,
    *,
    security_bin: str = "security",
) -> None:
    """Store ``secret`` as the generic-password for ``service``/``account``.

    Uses ``-U`` so an existing item is updated in place rather than rejected.
    ``security_bin`` is the binary to invoke, resolved on ``PATH``
    (overridable for tests).
    """
    subprocess.run(
        [
            security_bin,
            "add-generic-password",
            "-s",
            service,
            "-a",
            account,
            "-w",
            secret,
            "-U",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
