---
name: slack-file-upload
description: Upload a file to Slack as the user — it appears under their name, in the same conversation as their own messages, never as a bot — and get back the file's id and permalink. Fills the gap where the hosted Slack MCP has messaging, canvas, and search but no file-upload tool. Use when you have produced or have a file (an MP3 or other audio, an export, an image, a document, any attachment) that needs to go into Slack as the user; when the user asks to upload, attach, post, or share a file to a Slack channel, DM, or canvas; or when you need a Slack file handle (id + permalink) to embed or reference. Drives the whole cold start from only this Skill — detects an existing token, otherwise guides the user through the one-time Slack app install and authorize, then uploads.
compatibility: Requires Python 3.11+ and macOS (token stored in the Keychain; the SLACK_USER_TOKEN environment variable is the fallback on non-macOS or headless hosts).
---

# slack-file-upload

Upload a file to Slack **as the user**, so it lands under their name in the same
conversation as their own messages — never as a bot. Two bundled utilities do the
work — `slack-login` (one-time, mints and stores a token) and `slack-upload` (the
upload itself), both under this Skill's `scripts/` directory. You orchestrate them.
Run them with the Skill directory as your working directory, so the `scripts/…`
paths below resolve.

## The one decision: handle-only vs direct upload

- **Direct upload** — you have a target conversation (channel, DM, or group DM).
  Pass it and the file is posted there as the user in one step.
- **Handle-only upload** — you have no conversation (e.g. you'll embed the file in a
  canvas). Omit the conversation; you get back the file's `{ id, permalink }` to
  place yourself via your own Slack MCP calls.

Both return `{ id, permalink }` and need only the `files:write` scope.

## Workflow

Run the upload first and let it tell you whether a token is needed — don't probe
separately.

### Upload (default flow)

**Try the upload.** It checks for a Valid token before sending anything:

```sh
python3 scripts/slack-upload PATH [--conversation CONVERSATION_ID]
```

- On success it prints `{ id, permalink }` as JSON — you're done.
- If it exits with *"no valid Slack user token — run slack-login first"*.
  Go to step 2. Nothing was uploaded.

### Login and Upload (fallback flow)
If the token is missing or invalid, we use the following workflow.

1. **Guide the user through the one-time setup** (the only manual, human steps):  
   Install the Slack app into their workspace and **authorize** it — this is what 
   grants access. If the workspace requires admin approval of the app, that is
   handled out of band by whoever runs the service; the user only installs and
   authorizes.

2. Run the Login, which opens the authorize page in the browser:

   ```sh
   python3 scripts/slack-login
   ```

   The user authorizes once. The service mints a fresh user token and hands it
   back to a throwaway local listener over loopback; the token is written to the
   **Token Store**. `slack-login` confirms the token is valid; it never prints 
   the token.

3. **Upload.** Re-run the `slack-upload` command from step 1. It now finds the
   stored token and returns the file's `{ id, permalink }`, attributed to the user.

## Notes

- **Never paste or echo the token.** It lives in the Token Store; the utilities read
  it without prompting. Don't ask the user to copy it, and don't print it.
- **No conversation handy for a direct upload?** Do a handle-only upload and place
  the returned `permalink` yourself via your Slack MCP — that keeps the file
  attributed to the user (conversational cohesion) without a bot in the path.
- **Re-run `scripts/slack-login`** to rotate the token; the user revokes the Slack
  app to kill it.
