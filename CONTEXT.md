# sfu — Slack File Upload

A stateless utility that mints per-user Slack user tokens via OAuth, plus an agent
skill that uses those tokens to upload files to Slack as the user — filling the gap
where the hosted Slack MCP has no file-upload tool.

## Language

### Actors

**User**:
The human in whose Slack identity files are uploaded. The minted token belongs to
them. They perform exactly two manual acts: (first time) install the Slack app, and
authorize it.
_Avoid_: owner, account.

**Agent**:
The autonomous coding agent that consumes the skill — it detects the token, drives
the login flow on the User's behalf, and performs the upload. The Agent is the only
consumer; no other skill consumes the skill directly.
_Avoid_: client, caller, "skill" (the skill is a thing the Agent runs, not the Agent).

**Operator**:
Whoever runs and owns the deployed service. The Operator keeps the HTTPS endpoint
alive but never sees Users' tokens (the service is stateless).
_Avoid_: admin, host.

**Slack Workspace Admin** _(aliased external role)_:
The Slack-side administrator who approves the app's installation and scopes. Out of
band — handled by the Operator, not a first-class actor in this system.
_Avoid_: using "admin" alone to mean the Operator.

### OAuth flow

**Slack Redirect**:
The redirect hop from Slack back to the service, at the registered HTTPS endpoint,
carrying the authorization `code`. The only redirect URI registered with Slack.
_Avoid_: callback, OAuth callback.

**Handback**:
The redirect hop from the service to the local Listener over loopback, delivering
the minted token to the CLI that started the login.
_Avoid_: callback, localhost callback, redirect.

**Listener**:
The throwaway local HTTP server the CLI spins up to receive the Handback, then
shuts down.
_Avoid_: callback server, local server.

**Return URL**:
The `http://localhost:PORT` address the CLI passes in on the authorization request
and the service Handsback to. Validated to localhost / 127.0.0.1 only.
_Avoid_: callback URL; "redirect URI" (reserved for the Slack-registered endpoint).

### Token lifecycle

**Authorize**:
The User's act of granting the app access via Slack's consent screen. The human step.
_Avoid_: login (that's the whole flow), approve (reserved for the Slack Workspace
Admin's scope approval).

**Mint**:
The service's act of exchanging the authorization `code` for a fresh user token via
`oauth.v2.access`. Only the service mints.
_Avoid_: fetch, generate, issue.

**Token Store**:
The local, on-machine place the minted token lives: macOS Keychain (primary) with the
`SLACK_USER_TOKEN` environment variable as fallback. Resolution order is Keychain
first, then env.
_Avoid_: "keychain" used to mean the whole store, secret store, credential cache.

**Login**:
The composite end-to-end flow the Agent drives: open authorization → User Authorizes
→ service Mints → Handback → write to Token Store. The whole journey, not a step.
_Avoid_: using "login" for any single sub-step.

### Components

**Service** (`sfu`):
The stateless hosted TypeScript app: runs the OAuth flow, Mints tokens, serves the
landing page. Never in the file-transfer path; stores nothing.
_Avoid_: server, app (ambiguous with the Slack app).

**Skill** (`slack-file-upload`):
The agent skill installed via `npx skills`. Bundles the two utilities and the
`SKILL.md` that codifies the process. The unit the Agent discovers by description.

**`slack-login`**:
The utility (within the Skill) that runs Login.

**`slack-upload`**:
The utility (within the Skill) that performs the Upload.

**Slack app** _(aliased external)_:
The OAuth application registered in Slack that the User Authorizes. Distinct from the
Service (which operates the app's OAuth flow) and the Skill.
_Avoid_: "the app" unqualified.

### Upload

**Upload**:
The act `slack-upload` performs: putting a file into Slack as the User via
`files_upload_v2`, yielding the file's id and Permalink. Has two shapes (below).
Only ever needs `files:write`.
_Avoid_: post, attach, send.

**Handle-only upload**:
Upload with no Conversation. Creates a User-owned file with an id + Permalink but
posts it nowhere. The Agent then places the handle via MCP. Required for the
canvas-embed case (there is no Conversation to post into).
_Avoid_: orphan upload, unshared upload.

**Direct upload**:
Upload with a Conversation supplied. The file is posted into that Conversation as the
User, in one step.

**Conversation**:
The Slack target a Direct upload lands in: a channel, DM, or group DM. Optional input
to `slack-upload`. When omitted, the upload is Handle-only.
_Avoid_: channel (too narrow — excludes DMs), thread, room.

**Permalink**:
Slack's stable URL to an uploaded file, returned with its id. The handle an Agent
keeps to reference or embed the file afterwards.
_Avoid_: link, url, file URL.

**Valid token**:
A token that `auth.test` confirms still works. The validity check decides
Mint-vs-reuse at the start of an Upload.
_Avoid_: active token, live token.

**Conversational cohesion**:
The guiding principle: an uploaded file appears as the User, in the same Conversation
as the User's own messages, so the thread reads as one coherent flow. Achieved two
ways — a Direct upload, or a Handle-only upload whose handle the Agent injects via
MCP. The reason Uploads use the User's token, never a bot, and why external file
hosting is rejected.
