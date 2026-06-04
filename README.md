# sfu — Slack File Upload

A tiny stateless utility that mints a per-user Slack user token (`xoxp-`) via OAuth so agents can upload files to Slack as the user — filling the gap where the hosted Slack MCP has no file-upload tool.

Status: walking skeleton — both packages build and test green; OAuth flow and upload are not yet implemented.

## Monorepo layout

| Path       | What                                                                       |
| ---------- | -------------------------------------------------------------------------- |
| `service/` | The **Service** (`sfu`) — stateless TypeScript app that mints tokens.      |
| `skill/`   | The **Skill** (`slack-file-upload`) — Python agent skill that uploads.     |

The two are decoupled; the only contract between them is the OAuth handback shape and the token-storage convention. See `CONTEXT.md` for the domain language and `docs/adr/` for decisions.

## Service (TypeScript)

```sh
cd service
npm install
npm test     # tsx --test — unit tests
npm run build && npm start   # serve on $PORT (default 3000); GET / -> 200
```

Host-agnostic 12-factor app (Hono): listens on `$PORT`, all config from env, HTTPS terminated by the platform. Deployed on Dokku via `service/Procfile` + `service/CHECKS`. Because the app lives in a subdirectory, point Dokku at it once with:

```sh
dokku builder:set sfu build-dir service
```

## Skill (Python)

```sh
cd skill
uv sync
uv run pytest
```

Unit tests follow the pure-module convention with a **hermetic stub for the `security` CLI** (`tests/conftest.py` → `security_stub` fixture), so Keychain-backed code is testable without a GUI login session (ADR-0003).

## CI

`.github/workflows/ci.yml` runs both suites on push/PR to `main`: the Service across Node 22/24/26 and the Skill across Python 3.11/3.12/3.13.
