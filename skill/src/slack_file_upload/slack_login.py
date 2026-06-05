"""``slack-login`` — drives the end-to-end Login that Mints a token.

The CLI picks a free loopback port, generates a nonce, starts a throwaway Listener,
and opens ``/auth`` at the Service. Slack round-trips the Login through the Service,
which Hands the token back to the Listener over loopback. The Listener verifies the
nonce, writes the token to the Token Store, and shuts down (ADR-0002).

This module owns the deep, testable pieces of that flow. The browser-opening and
socket plumbing around them are integration-shaped and covered by the Listener's
hermetic loopback test rather than unit tests.

Hard constraint (ADR-0002): never log the token or the Handback URL. The token
travels only in a loopback query string and is handed straight to the Token Store.
"""

import argparse
import os
import secrets
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Callable
from urllib.parse import parse_qs, urlencode, urlparse

from . import token_store
from .validity import is_valid

# The deployed Service that runs the OAuth flow. Overridable for a self-hosted
# Operator deployment; matches the Token Store's Keychain service identity.
DEFAULT_SERVICE_URL = "https://sfu.wduyck.me"


class HandbackError(Exception):
    """The Handback could not be trusted: nonce mismatch or no token present."""


def extract_token(query: str, *, expected_nonce: str) -> str:
    """Verify a Handback query string and return the Minted token.

    ``query`` is the raw query string of the loopback Handback request
    (``token=…&state=NONCE``). The ``state`` must equal ``expected_nonce`` — this
    is what stops a stray request to the Listener from injecting a token. Raises
    ``HandbackError`` on a nonce mismatch or a missing token.
    """
    params = parse_qs(query)
    nonce = params.get("state", [None])[0]
    if nonce != expected_nonce:
        raise HandbackError("Handback nonce did not match the pending Login")

    token = params.get("token", [None])[0]
    if not token:
        raise HandbackError("Handback carried no token")
    return token


class _HandbackHandler(BaseHTTPRequestHandler):
    """Handles the single loopback Handback request the Listener exists to receive."""

    def do_GET(self) -> None:  # noqa: N802 (BaseHTTPRequestHandler API)
        listener: "Listener" = self.server.listener  # type: ignore[attr-defined]
        query = urlparse(self.path).query
        try:
            token = extract_token(query, expected_nonce=listener.expected_nonce)
        except HandbackError:
            # A stray or forged request: refuse it, but keep waiting for the real one.
            self.send_response(400)
            self.end_headers()
            return

        listener._deliver(token)
        # Send the browser on to the clean /success page — the token stays out of it.
        self.send_response(302)
        self.send_header("Location", listener.success_url)
        self.end_headers()

    def log_message(self, *args: object) -> None:
        # CRITICAL: the request path carries the token in its query string. The default
        # handler logs that line to stderr, which would leak the token (ADR-0002).
        # Silence it entirely.
        pass


class Listener:
    """The throwaway loopback server the CLI spins up to receive the Handback.

    Binds an ephemeral ``localhost`` port, serves until one valid Handback arrives,
    writes the token to the Token Store via the injected ``store`` callable, redirects
    the browser to ``success_url``, and shuts down. The nonce check (via
    :func:`extract_token`) is what stops anything but the matching Login from
    delivering a token (ADR-0002).
    """

    def __init__(
        self,
        *,
        expected_nonce: str,
        store: Callable[[str], None],
        success_url: str,
        host: str = "localhost",
    ) -> None:
        self.expected_nonce = expected_nonce
        self.success_url = success_url
        self._store = store
        self._host = host
        self._event = threading.Event()
        self._token: str | None = None

    def __enter__(self) -> "Listener":
        self._server = HTTPServer((self._host, 0), _HandbackHandler)
        self._server.listener = self  # type: ignore[attr-defined]
        self.port = self._server.server_address[1]
        self.return_url = f"http://{self._host}:{self.port}"
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        return self

    def _deliver(self, token: str) -> None:
        self._store(token)
        self._token = token
        self._event.set()
        # serve_forever() can't be stopped from its own thread, so shut down off-thread.
        threading.Thread(target=self._server.shutdown, daemon=True).start()

    def wait(self, timeout: float = 300) -> str:
        """Block until a valid Handback is received; return the Minted token."""
        if not self._event.wait(timeout):
            raise TimeoutError("no Handback received before timeout")
        assert self._token is not None
        return self._token

    def __exit__(self, *exc: object) -> None:
        self._server.shutdown()
        self._server.server_close()
        self._thread.join(timeout=5)


def login(
    service_url: str,
    *,
    store: Callable[[str], None],
    open_browser: Callable[[str], object] = webbrowser.open,
    timeout: float = 300,
) -> str:
    """Run a full Login and return the Minted token (also written to the Token Store).

    Picks a free loopback port and a fresh nonce, starts a :class:`Listener`, and
    opens ``service_url/auth?return=…&state=NONCE`` in the browser. The User
    Authorizes once; the Service Mints the token and Hands it back to the Listener,
    which verifies the nonce, writes it to the Token Store via ``store``, and shuts
    down. The Service is stateless throughout — the nonce and Return URL ride in the
    OAuth ``state`` (ADR-0002).

    ``open_browser`` and ``store`` are injected so the whole flow is testable without
    a real browser or Keychain.
    """
    nonce = secrets.token_urlsafe(32)
    success_url = f"{service_url.rstrip('/')}/success"
    with Listener(
        expected_nonce=nonce, store=store, success_url=success_url
    ) as listener:
        query = urlencode({"return": listener.return_url, "state": nonce})
        open_browser(f"{service_url.rstrip('/')}/auth?{query}")
        return listener.wait(timeout)


def main(argv: list[str] | None = None) -> int:
    """``slack-login`` entry point: run a Login and confirm the token is Valid.

    Never prints the token (ADR-0002) — only that the Login succeeded.
    """
    parser = argparse.ArgumentParser(
        prog="slack-login",
        description="Authorize sfu and save a Slack user token to the Token Store.",
    )
    parser.add_argument(
        "--service-url",
        default=os.environ.get("SFU_SERVICE_URL", DEFAULT_SERVICE_URL),
        help="The sfu Service that runs the OAuth flow (default: %(default)s).",
    )
    args = parser.parse_args(argv)
    service_url = args.service_url

    print(f"Opening {service_url}/auth in your browser — authorize sfu to continue…")
    try:
        token = login(service_url, store=token_store.store_token)
    except TimeoutError:
        print("error: timed out waiting for authorization", file=sys.stderr)
        return 1

    if not is_valid(token):
        print("error: the minted token failed auth.test", file=sys.stderr)
        return 1

    print("Logged in. Your Slack token is saved to the Token Store.")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
