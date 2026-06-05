# sfu — Slack File Upload

[![CI](https://github.com/fuzzyfox/sfu/actions/workflows/ci.yml/badge.svg)](https://github.com/fuzzyfox/sfu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/fuzzyfox/sfu)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![Python](https://img.shields.io/badge/python-%3E%3D3.11-blue)](https://www.python.org)
[![Last commit](https://img.shields.io/github/last-commit/fuzzyfox/sfu)](https://github.com/fuzzyfox/sfu/commits/main)

**Let your coding agent upload files to Slack as you** — under your name, in the same
conversation as your own messages, never as a bot.

The hosted Slack MCP can message, search, and edit canvases, but it has no way to
upload a file. `sfu` fills that gap: an agent skill that uploads files as you, backed
by a tiny stateless service that mints a personal Slack token via OAuth.

## What it gets you

- 📎 **Uploads attributed to you** — an MP3, an export, an image, a document lands in
  Slack under your name, so the thread reads as one coherent conversation.
- 🤖 **Agent-driven** — your agent runs the whole thing: it detects whether you're
  already signed in, walks you through a one-time authorize if not, then uploads.
- 🔐 **Nothing to babysit** — your token lives only on your machine (macOS Keychain,
  with an env-var fallback). The service stores nothing and never sees your files.
- 🪪 **One-time setup** — you authorize the Slack app once. After that, uploads just
  work until you revoke it.

## How it works

1. You ask your agent to put a file into Slack.
2. The agent tries the upload. If you already have a valid token, you're done.
3. If not, the agent opens Slack's authorize page. You click approve **once**.
4. The service exchanges that approval for a personal token (`xoxp-`) and hands it
   back to your machine, where it's stored in the Keychain. Your file uploads.

The service is never in the file path — it only mints the token. Your file goes
straight from your machine to Slack.

```
you ──ask──▶ agent ──upload──▶ Slack
                │
                └─ first time only: authorize ▶ service ──mints token──▶ your Keychain
```

## Install the skill

```sh
npx skills add fuzzyfox/sfu
```

Then just ask your agent to upload something to Slack — it knows the rest.

**Requirements:** Python 3.11+ and macOS (token stored in the Keychain; on other
platforms set the `SLACK_USER_TOKEN` environment variable instead).

### Two ways files land in Slack

- **Direct upload** — you name a channel, DM, or group DM, and the file is posted
  there as you in one step.
- **Handle-only upload** — no conversation needed (e.g. you're embedding the file in
  a canvas). You get back the file's `{ id, permalink }` to place yourself.

Both need only the `files:write` Slack scope.

## Running the service

The skill talks to a small hosted service that runs the OAuth flow. If you're a
maintainer standing one up, see [`service/`](service/) — it's a host-agnostic
12-factor app (Hono) that listens on `$PORT`, reads all config from env, and is
deployed on Dokku. It's stateless: it mints tokens and serves a landing page, and
keeps nothing.

## Project layout

| Path                  | What                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| [`skill/`](skill/)    | The **Skill** (`slack-file-upload`) — the Python agent skill you install. |
| [`service/`](service/) | The **Service** (`sfu`) — the stateless TypeScript app that mints tokens. |

The two are decoupled; the only contract between them is the OAuth handback shape and
the token-storage convention. See [`CONTEXT.md`](CONTEXT.md) for the domain language
and [`docs/adr/`](docs/adr/) for the decisions behind it.

## Contributing & local development

Both packages build and test green; the OAuth flow and upload are actively being
built out.

```sh
# Service (TypeScript)
cd service && npm install && npm test

# Skill (Python)
cd skill && uv sync && uv run pytest
```

CI (`.github/workflows/ci.yml`) runs both suites on every push and PR to `main` — the
Service across Node 22/24/26 and the Skill across Python 3.11/3.12/3.13.

## License

[MIT](LICENSE) © William Duyck
