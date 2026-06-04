from slack_file_upload.security_cli import read_password


def test_returns_secret_when_keychain_item_exists(security_stub):
    security_stub.set("sfu", "william", "xoxp-test-token")

    assert read_password("sfu", "william") == "xoxp-test-token"


def test_returns_none_when_keychain_item_absent(security_stub):
    assert read_password("sfu", "nobody") is None
