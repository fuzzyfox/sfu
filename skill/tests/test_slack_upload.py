import pytest

from slack_file_upload.slack_upload import LoginRequired, upload, upload_file


class FakeTransport:
    """An in-memory stand-in for the Slack v2 external-upload flow.

    Records what each step received so a test can assert on the observable
    behaviour of the uploader — which Conversation a file is shared into, the
    bytes streamed, the id threaded through — without mocking Slack's HTTP wire
    format. The real transport (urllib over the ``files.*`` endpoints) is
    integration-shaped and covered by manual verification instead.
    """

    def __init__(self, *, file_id="F123", permalink="https://slack.example/files/F123"):
        self._file_id = file_id
        self._permalink = permalink
        self.get_url_calls: list[tuple[str, int]] = []
        self.put_calls: list[tuple[str, bytes]] = []
        self.complete_calls: list[dict] = []

    def get_upload_url(self, filename: str, length: int) -> tuple[str, str]:
        self.get_url_calls.append((filename, length))
        return "https://upload.slack.example/x", self._file_id

    def put_bytes(self, upload_url: str, data: bytes) -> None:
        self.put_calls.append((upload_url, data))

    def complete_upload(self, files, *, channel_id=None) -> dict:
        self.complete_calls.append({"files": files, "channel_id": channel_id})
        return {"files": [{"id": self._file_id, "permalink": self._permalink}]}


def test_handle_only_upload_returns_id_and_permalink_and_shares_nowhere():
    transport = FakeTransport(file_id="F999", permalink="https://slack.example/F999")

    result = upload(b"audio-bytes", filename="update.mp3", transport=transport)

    assert result == {"id": "F999", "permalink": "https://slack.example/F999"}
    # Handle-only: the file is created but posted nowhere — no Conversation.
    assert transport.complete_calls[0]["channel_id"] is None


def test_direct_upload_posts_into_the_supplied_conversation():
    transport = FakeTransport(file_id="F42", permalink="https://slack.example/F42")

    result = upload(
        b"audio-bytes",
        filename="update.mp3",
        conversation="C0CONVO",
        transport=transport,
    )

    assert result == {"id": "F42", "permalink": "https://slack.example/F42"}
    # Direct: the file is shared into that Conversation, as the User.
    assert transport.complete_calls[0]["channel_id"] == "C0CONVO"


def test_upload_streams_the_bytes_and_threads_the_file_id_through():
    transport = FakeTransport(file_id="Fupload")

    upload(b"twelve bytes", filename="report.pdf", transport=transport)

    # The upload URL is requested for this filename and exact byte length…
    assert transport.get_url_calls == [("report.pdf", len(b"twelve bytes"))]
    # …the bytes are streamed to the URL it handed back…
    assert transport.put_calls == [("https://upload.slack.example/x", b"twelve bytes")]
    # …and the file id from that step is the one completed.
    assert transport.complete_calls[0]["files"] == [{"id": "Fupload"}]


def test_missing_token_signals_a_login_is_needed_without_uploading():
    transport = FakeTransport()

    with pytest.raises(LoginRequired):
        upload_file(
            b"x",
            filename="update.mp3",
            resolve=lambda: None,
            make_transport=lambda token: transport,
        )

    # Nothing was uploaded — the Agent must drive a Login first.
    assert transport.complete_calls == []


def test_invalid_token_signals_a_login_is_needed_without_uploading():
    transport = FakeTransport()

    with pytest.raises(LoginRequired):
        upload_file(
            b"x",
            filename="update.mp3",
            resolve=lambda: "xoxp-stale",
            validate=lambda token: False,  # auth.test says this token no longer works
            make_transport=lambda token: transport,
        )

    assert transport.complete_calls == []


def test_valid_token_is_reused_to_upload_and_returns_id_and_permalink():
    transport = FakeTransport(file_id="Fok", permalink="https://slack.example/Fok")
    built_with: list[str] = []

    result = upload_file(
        b"audio-bytes",
        filename="update.mp3",
        conversation="C0CONVO",
        resolve=lambda: "xoxp-good",
        validate=lambda token: True,  # auth.test confirms it still works
        make_transport=lambda token: built_with.append(token) or transport,
    )

    assert result == {"id": "Fok", "permalink": "https://slack.example/Fok"}
    # The reused token is the one the transport authenticates with.
    assert built_with == ["xoxp-good"]
    assert transport.complete_calls[0]["channel_id"] == "C0CONVO"
