import http.client

import pytest

from urllib.parse import parse_qs, urlparse

from slack_file_upload.slack_login import HandbackError, Listener, login, extract_token


def _handback(port: int, query: str) -> http.client.HTTPResponse:
    """Fire a raw loopback Handback at the Listener without following redirects."""
    conn = http.client.HTTPConnection("localhost", port)
    conn.request("GET", f"/callback?{query}")
    return conn.getresponse()


def test_extracts_token_when_nonce_matches():
    query = "token=xoxp-the-token&state=nonce-xyz"

    assert extract_token(query, expected_nonce="nonce-xyz") == "xoxp-the-token"


def test_rejects_handback_whose_nonce_does_not_match():
    query = "token=xoxp-the-token&state=wrong-nonce"

    with pytest.raises(HandbackError):
        extract_token(query, expected_nonce="nonce-xyz")


def test_rejects_handback_with_no_token():
    query = "state=nonce-xyz"

    with pytest.raises(HandbackError):
        extract_token(query, expected_nonce="nonce-xyz")


def test_listener_receives_handback_stores_token_and_shuts_down(capsys):
    stored: list[str] = []
    with Listener(
        expected_nonce="nonce-xyz",
        store=stored.append,
        success_url="https://sfu.example/success",
    ) as listener:
        resp = _handback(listener.port, "token=xoxp-the-token&state=nonce-xyz")

        # The browser is sent on to the clean /success page — no token in the redirect.
        assert resp.status == 302
        assert resp.getheader("Location") == "https://sfu.example/success"

        token = listener.wait(timeout=2)

    assert token == "xoxp-the-token"
    assert stored == ["xoxp-the-token"]
    # The token must never be logged — not even via the default HTTP request log line.
    assert "xoxp-the-token" not in capsys.readouterr().err


def test_listener_rejects_a_handback_with_the_wrong_nonce(capsys):
    stored: list[str] = []
    with Listener(
        expected_nonce="nonce-xyz",
        store=stored.append,
        success_url="https://sfu.example/success",
    ) as listener:
        resp = _handback(listener.port, "token=xoxp-the-token&state=WRONG")

        assert resp.status == 400

    # A stray/forged Handback writes nothing to the Token Store.
    assert stored == []


def test_login_drives_a_full_flow_and_writes_the_token_to_the_store():
    stored: list[str] = []

    # Stand in for the Service + Slack + browser: when slack-login "opens" /auth,
    # parse the loopback Return URL and nonce out of it and fire the Handback, exactly
    # as the real Service would after Minting.
    def fake_browser(auth_url: str) -> None:
        params = parse_qs(urlparse(auth_url).query)
        return_url = params["return"][0]
        nonce = params["state"][0]
        port = urlparse(return_url).port
        _handback(port, f"token=xoxp-end-to-end&state={nonce}")

    token = login(
        "https://sfu.example",
        store=stored.append,
        open_browser=fake_browser,
    )

    assert token == "xoxp-end-to-end"
    assert stored == ["xoxp-end-to-end"]

