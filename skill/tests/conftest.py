"""Hermetic stub for the macOS `security` CLI.

The Token Store shells out to `security` to read/write the Keychain (ADR-0003).
Real Keychain access needs an unlocked GUI login session, so it can't run in CI
or unattended tests. This fixture puts a fake `security` executable first on
`PATH`; the code under test resolves `security` there and never touches the real
Keychain. This is the convention every later Token Store test builds on.
"""

import json
import os
import stat
from pathlib import Path

import pytest

# A stand-in `security` binary. It understands the two shapes the Token Store
# uses — `find-generic-password -s <service> -a <account> -w` (read) and
# `add-generic-password -s <service> -a <account> -w <secret> -U` (write) — and
# keeps state in a JSON store the test populates. Absent items mirror the real
# CLI: nonzero exit plus a stderr message.
_STUB_SOURCE = '''#!/usr/bin/env python3
import json, os, sys

args = sys.argv[1:]
cmd = args[0] if args else None

def opt(flag):
    return args[args.index(flag) + 1] if flag in args else None

store_path = os.environ["SFU_STUB_STORE"]
with open(store_path) as fh:
    store = json.load(fh)

# A locked / non-GUI Keychain refuses every access with errSecInteractionNotAllowed.
if os.environ.get("SFU_STUB_LOCKED") == "1":
    sys.stderr.write("security: User interaction is not allowed.\\n")
    sys.exit(51)

key = f"{opt('-s')}\\x00{opt('-a')}"

if cmd == "add-generic-password":
    store[key] = opt("-w")
    with open(store_path, "w") as fh:
        json.dump(store, fh)
    sys.exit(0)

if cmd == "find-generic-password":
    if key in store:
        if "-w" in args:
            sys.stdout.write(store[key])
        sys.exit(0)
    sys.stderr.write(
        "security: SecKeychainSearchCopyNext: "
        "The specified item could not be found in the keychain.\\n"
    )
    sys.exit(44)

sys.exit(2)
'''


class SecurityStub:
    """Handle a test uses to seed Keychain items the stub will return."""

    def __init__(self, store_path: Path, monkeypatch):
        self._store_path = store_path
        self._monkeypatch = monkeypatch
        self._items: dict[str, str] = {}
        self._flush()

    def set(self, service: str, account: str, secret: str) -> None:
        self._items[f"{service}\x00{account}"] = secret
        self._flush()

    def lock(self) -> None:
        """Make every access fail as a locked / non-GUI Keychain would."""
        self._monkeypatch.setenv("SFU_STUB_LOCKED", "1")

    def _flush(self) -> None:
        self._store_path.write_text(json.dumps(self._items))


@pytest.fixture
def security_stub(tmp_path, monkeypatch):
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    stub = bin_dir / "security"
    stub.write_text(_STUB_SOURCE)
    stub.chmod(stub.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

    store_path = tmp_path / "store.json"
    monkeypatch.setenv("SFU_STUB_STORE", str(store_path))
    monkeypatch.setenv("PATH", f"{bin_dir}{os.pathsep}{os.environ['PATH']}")
    # Keep the env-var fallback out of the picture unless a test opts in.
    monkeypatch.delenv("SLACK_USER_TOKEN", raising=False)

    return SecurityStub(store_path, monkeypatch)
