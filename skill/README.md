# slack-file-upload

Agent skill (Python) that uploads files to Slack as the user.

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
