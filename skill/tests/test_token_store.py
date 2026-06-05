import pytest

from slack_file_upload.security_cli import KeychainUnavailable
from slack_file_upload.token_store import (
    ACCOUNT,
    ENV_VAR,
    SERVICE,
    resolve_token,
    store_token,
)


def test_resolves_token_from_keychain(security_stub):
    security_stub.set(SERVICE, ACCOUNT, "xoxp-keychain")

    assert resolve_token() == "xoxp-keychain"


def test_falls_back_to_env_when_keychain_absent(security_stub, monkeypatch):
    monkeypatch.setenv("SLACK_USER_TOKEN", "xoxp-from-env")

    assert resolve_token() == "xoxp-from-env"


def test_keychain_wins_over_env(security_stub, monkeypatch):
    security_stub.set(SERVICE, ACCOUNT, "xoxp-keychain")
    monkeypatch.setenv("SLACK_USER_TOKEN", "xoxp-from-env")

    assert resolve_token() == "xoxp-keychain"


def test_returns_none_when_neither_keychain_nor_env(security_stub):
    assert resolve_token() is None


def test_locked_keychain_falls_back_to_env(security_stub, monkeypatch):
    security_stub.lock()
    monkeypatch.setenv("SLACK_USER_TOKEN", "xoxp-from-env")

    assert resolve_token() == "xoxp-from-env"


def test_locked_keychain_without_env_raises_pointing_at_fallback(security_stub):
    security_stub.lock()

    with pytest.raises(KeychainUnavailable, match=ENV_VAR):
        resolve_token()


def test_store_then_resolve_round_trips(security_stub):
    store_token("xoxp-stored")

    assert resolve_token() == "xoxp-stored"
