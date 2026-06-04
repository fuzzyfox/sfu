"""Thin wrapper over the macOS `security` CLI.

The Token Store reads and writes the Keychain by shelling out to `security`
rather than via the `keyring` library, so reads inherit the writing binary's
ACL and never trigger a GUI prompt (ADR-0003). This module is that seam; the
full Token Store resolution (Keychain-first, env-var fallback) builds on it.
"""

import subprocess


def read_password(
    service: str,
    account: str,
    *,
    security_bin: str = "security",
) -> str | None:
    """Return the generic-password secret for ``service``/``account``.

    Returns ``None`` when no matching Keychain item exists. ``security_bin``
    is the binary to invoke, resolved on ``PATH`` (overridable for tests).
    """
    result = subprocess.run(
        [security_bin, "find-generic-password", "-s", service, "-a", account, "-w"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    return result.stdout.rstrip("\n")
