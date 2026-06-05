"""The Token Store: where the minted Slack user token lives on-machine.

Primary storage is the macOS Keychain, reached by shelling out to `security`
(ADR-0003); the `SLACK_USER_TOKEN` environment variable is the fallback for
non-GUI / headless contexts. Resolution on read is Keychain first, then env.
"""

import os

from . import security_cli

# The Keychain generic-password item this Skill owns.
SERVICE = "sfu.wduyck.me"
ACCOUNT = "slack-file-upload"

# The fallback for non-GUI / headless contexts.
ENV_VAR = "SLACK_USER_TOKEN"


def store_token(token: str) -> None:
    """Write ``token`` to the Keychain as this Skill's stored Slack user token."""
    security_cli.write_password(SERVICE, ACCOUNT, token)


def resolve_token() -> str | None:
    """Return the stored Slack user token, or ``None`` if none is available.

    Resolution order is Keychain first, then the ``SLACK_USER_TOKEN`` env var.
    Raises ``security_cli.KeychainUnavailable`` only when the Keychain is locked
    or unavailable *and* no env-var fallback is set — the message points the
    caller at ``SLACK_USER_TOKEN``.
    """
    locked = None
    try:
        token = security_cli.read_password(SERVICE, ACCOUNT)
    except security_cli.KeychainUnavailable as exc:
        token, locked = None, exc
    if token is not None:
        return token

    env_token = os.environ.get(ENV_VAR)
    if env_token is not None:
        return env_token

    if locked is not None:
        raise security_cli.KeychainUnavailable(
            f"{locked} The Keychain is locked or unavailable (e.g. a headless "
            f"or SSH session). Set the {ENV_VAR} environment variable to the "
            "Slack user token as a fallback."
        ) from locked
    return None
