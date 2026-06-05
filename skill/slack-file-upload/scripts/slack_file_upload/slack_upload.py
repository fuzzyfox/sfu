"""``slack-upload`` — Upload a file to Slack as the User via the v2 external flow.

The Upload has two shapes, both needing only ``files:write`` (CONTEXT.md): a
**Handle-only upload** (no Conversation) that creates a User-owned file and returns
``{id, permalink}`` for the Agent to place itself, and a **Direct upload** (a
Conversation supplied) that posts the file into that Conversation as the User in one
step. The Conversation argument is what selects between them.

This module owns the deep, testable orchestration of that flow — the shape selection,
the streaming of bytes, the ``{id, permalink}`` it returns. The HTTP calls to Slack's
``files.*`` endpoints live behind an injected ``transport`` so the orchestration is
testable without mocking Slack's wire format; the real transport is integration-shaped
and covered by manual verification (per the PRD's testing decisions).
"""


import argparse
import json
import os
import sys
import urllib.request
from typing import Callable
from urllib.parse import urlencode

from . import token_store
from .validity import is_valid


class LoginRequired(Exception):
    """No Valid token is in the Token Store — the Agent must drive a Login first."""


class SlackUploadError(Exception):
    """Slack rejected one of the ``files.*`` calls in the Upload flow."""


def upload_file(
    data,
    *,
    filename,
    conversation=None,
    resolve=token_store.resolve_token,
    validate=is_valid,
    make_transport=None,
):
    """Upload ``data`` using the stored token, after the Valid token check.

    Resolves the token from the Token Store and runs the Valid token check
    (``auth.test``) before uploading: a still-working token is reused; a missing or
    invalid one raises :class:`LoginRequired` — the signal that a Login is needed —
    and nothing is uploaded. Returns the file's ``{id, permalink}`` on success.
    """
    if make_transport is None:
        make_transport = SlackTransport
    token = resolve()
    if token is None or not validate(token):
        raise LoginRequired(
            "No valid Slack user token in the Token Store. Run a Login first."
        )
    transport = make_transport(token)
    return upload(data, filename=filename, conversation=conversation, transport=transport)


def upload(data, *, filename, conversation=None, transport):
    """Upload ``data`` as ``filename`` and return its ``{id, permalink}``.

    The ``conversation`` argument selects the shape: omit it for a Handle-only
    upload (the file is created but posted nowhere); supply a Conversation for a
    Direct upload (the file is shared into it, as the User).
    """
    upload_url, file_id = transport.get_upload_url(filename, len(data))
    transport.put_bytes(upload_url, data)
    response = transport.complete_upload([{"id": file_id}], channel_id=conversation)
    file = response["files"][0]
    return {"id": file["id"], "permalink": file["permalink"]}


class SlackTransport:
    """The real Slack v2 external-upload flow over ``files.*``, with the User's token.

    Three thin HTTP hops — ``files.getUploadURLExternal`` → POST the bytes to the URL
    it returns → ``files.completeUploadExternal`` — each needing only ``files:write``;
    sharing rides on ``completeUploadExternal``'s ``channel_id``, never
    ``chat.postMessage``, so ``chat:write`` is not used (CONTEXT.md). Integration-shaped
    and stdlib-only (matching ``validity.py``), so the Skill keeps no dependency just to
    upload; covered by manual verification rather than unit tests against Slack's wire
    format.
    """

    def __init__(self, token: str, *, urlopen: Callable = urllib.request.urlopen) -> None:
        self._token = token
        self._urlopen = urlopen

    def get_upload_url(self, filename: str, length: int) -> tuple[str, str]:
        resp = self._post_api(
            "files.getUploadURLExternal",
            {"filename": filename, "length": str(length)},
        )
        return resp["upload_url"], resp["file_id"]

    def put_bytes(self, upload_url: str, data: bytes) -> None:
        req = urllib.request.Request(upload_url, data=data, method="POST")
        with self._urlopen(req) as resp:
            resp.read()

    def complete_upload(self, files, *, channel_id=None) -> dict:
        params = {"files": json.dumps(files)}
        if channel_id is not None:
            params["channel_id"] = channel_id
        return self._post_api("files.completeUploadExternal", params)

    def _post_api(self, method: str, params: dict) -> dict:
        req = urllib.request.Request(
            f"https://slack.com/api/{method}",
            data=urlencode(params).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self._token}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )
        with self._urlopen(req) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        if not body.get("ok"):
            raise SlackUploadError(f"{method} failed: {body.get('error', 'unknown')}")
        return body


def main(argv: list[str] | None = None) -> int:
    """``slack-upload`` entry point: Upload a file and print its ``{id, permalink}``.

    With no ``--conversation`` this is a Handle-only upload; with one it is a Direct
    upload into that Conversation. Prints the ``{id, permalink}`` as JSON on success.
    """
    parser = argparse.ArgumentParser(
        prog="slack-upload",
        description="Upload a file to Slack as you, returning its id and permalink.",
    )
    parser.add_argument("path", help="Path to the file to upload.")
    parser.add_argument(
        "--conversation",
        help="Conversation id to post into (channel, DM, or group DM). "
        "Omit for a handle-only upload that posts nowhere.",
    )
    args = parser.parse_args(argv)

    with open(args.path, "rb") as fh:
        data = fh.read()

    try:
        result = upload_file(
            data,
            filename=os.path.basename(args.path),
            conversation=args.conversation,
        )
    except LoginRequired:
        print(
            "error: no valid Slack user token — run slack-login first",
            file=sys.stderr,
        )
        return 1
    except SlackUploadError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(result))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
