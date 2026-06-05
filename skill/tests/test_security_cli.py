import pytest

from slack_file_upload.security_cli import (
    KeychainUnavailable,
    read_password,
    write_password,
)


def test_returns_secret_when_keychain_item_exists(security_stub):
    security_stub.set("sfu", "william", "xoxp-test-token")

    assert read_password("sfu", "william") == "xoxp-test-token"


def test_returns_none_when_keychain_item_absent(security_stub):
    assert read_password("sfu", "nobody") is None


def test_written_password_can_be_read_back(security_stub):
    write_password("sfu", "william", "xoxp-written-token")

    assert read_password("sfu", "william") == "xoxp-written-token"


def test_read_raises_when_keychain_locked(security_stub):
    security_stub.set("sfu", "william", "xoxp-test-token")
    security_stub.lock()

    with pytest.raises(KeychainUnavailable):
        read_password("sfu", "william")
