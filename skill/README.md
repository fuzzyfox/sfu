# slack-file-upload

Agent skill (Python) that uploads files to Slack as the user.

## Layout

This directory is the **dev/test workspace**, not the installable Skill itself:

| Path                       | What                                                                         |
| -------------------------- | ---------------------------------------------------------------------------- |
| `slack-file-upload/`       | The installable Skill ([agentskills.io](https://agentskills.io) spec): `SKILL.md` + bundled `scripts/`. `npx skills` copies this directory; `name` matches the directory name. |
| `slack-file-upload/scripts/` | The `slack-login` / `slack-upload` wrappers and the stdlib-only `slack_file_upload` package they run — no install needed. |
| `tests/`                   | The Python test suite (stays outside the Skill so the shipped directory is clean). |
| `pyproject.toml`           | Dev/test config. The `[project.scripts]` console entry points are a local-dev convenience; agents run the bundled `scripts/…` wrappers. |

Run the suite with `uv sync && uv run pytest`.

## Utilities

- **`slack-login`** — runs the end-to-end Login: Authorize the Slack app, Mint a
  user token, and write it to the Token Store.
- **`slack-upload PATH [--conversation ID]`** — Uploads a file to Slack as you,
  printing the file's `{ id, permalink }` as JSON. Before uploading it runs the
  Valid token check (`auth.test`): a still-working token is reused; a missing or
  invalid one exits with guidance to run `slack-login` first.
  - **Handle-only upload** (no `--conversation`) — creates a user-owned file and
    returns its id + permalink, but posts it nowhere; place the handle yourself.
  - **Direct upload** (`--conversation ID`) — posts the file into that Conversation
    (channel, DM, or group DM) as you, in one step.

Both shapes need only the `files:write` user scope — sharing goes through
`files.completeUploadExternal`, never `chat.postMessage`.
