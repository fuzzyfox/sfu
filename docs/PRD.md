# PRD — `sfu` (Slack File Upload)

> Status: Ready for agent · Owner: fuzzyfox · Repo: https://github.com/fuzzyfox/sfu

## Problem Statement

I want an agent to be able to upload a file (for example an MP3) into a Slack
conversation **as me**, so that the file lands in the *same* conversation as my
own messages and keeps the thread coherent for both me and the reader.

Today this is impossible through the hosted Slack MCP: it has messaging, canvas,
and search tools but **no file-upload tool**, and it won't soon. So when an agent
produces a file that belongs in Slack (audio for a spoken update, an export, an
attachment), there is no first-class way to attach it as the user. Workarounds —
a bot uploading the file elsewhere, or hosting the file externally — break
conversational cohesion: the file ends up as a separate message in a separate
place, attributed to something that is not me.

Minting a Slack **user token** (`xoxp-`) would solve this, but Slack OAuth
rejects plain `http://localhost` redirect URIs — they must be HTTPS. So there is
no fully self-serve way to mint a per-user token from a local machine without one
small hosted HTTPS endpoint. That endpoint is the missing piece.

## Solution

A tiny, **stateless** utility — `sfu` — plus a self-contained agent skill.

1. **The `sfu` service.** A small hosted HTTPS service (modelled on
   [`fuzzyfox/wmgid`](https://github.com/fuzzyfox/wmgid)) whose only job is to run
   the Slack OAuth v2 flow and hand the user their own `xoxp-` token. It stores
   nothing — no database, no tokens, no token in logs — and it is never in the
   file-transfer path. It also serves a simple landing page (human- and
   agent-friendly) so the whole flow can be discovered and driven from a bare URL.

2. **The `slack-file-upload` skill.** A single self-contained agent skill,
   installable via `npx skills`, that codifies the entire process: detect whether
   a valid user token already exists; if not, guide the user through installing
   the Slack app and authenticating (the only steps a human performs), mint the
   token, and store it locally; then upload a file with the token and return the
   file's id and permalink.

The agent is the consumer. Other skills need no knowledge of `sfu`; an agent that
needs to put a file into Slack infers from the skill's description that
`slack-file-upload` can help, and the skill guides it the rest of the way.

The file is uploaded with the user's own token, so it appears as the user, in the
target conversation — preserving cohesion. The service stays out of the way once
the token is minted, exactly like `wmgid` surfaces your claim and steps aside.

## User Stories

1. As an agent that has produced a file destined for Slack, I want a skill I can
   reach for by capability description, so that I can upload the file without the
   user having to wire anything up.
2. As an agent, I want to detect whether a valid Slack user token already exists
   on the machine, so that I can skip the whole authentication flow when it is
   unnecessary.
3. As an agent, I want to guide the user through installing the Slack app and
   authenticating when no valid token exists, so that I can bootstrap from a cold
   start using only the skill.
4. As a user, I want my only manual steps to be adding the app to Slack and
   clicking authorize, so that setup is as low-friction as possible.
5. As an agent, I want to start the OAuth flow, capture the returned token, and
   store it locally without further user involvement, so that the user is not
   asked to copy and paste a live credential.
6. As an agent, I want to upload a file to a specified Slack conversation as the
   user, so that the file appears in the same thread as the user's own messages.
7. As an agent, I want the upload to return the file id and permalink, so that I
   can reference or embed the uploaded file afterwards.
8. As a user, I want the uploaded file attributed to me rather than to a bot, so
   that the conversation stays coherent for me and for readers.
9. As a user, I want my minted token stored securely on my machine (Keychain), so
   that a live posting credential is not left sitting in plaintext.
10. As a user on a non-GUI or headless context, I want a documented environment
    variable fallback for the token, so that I am not blocked when the Keychain is
    unavailable.
11. As an agent, I want to read the stored token without triggering an interactive
    prompt, so that the upload flow runs unattended after the one-time auth.
12. As a user, I want to land on the `sfu` website and understand what it is and
    how to use it, so that I can decide to adopt it.
13. As a user, I want an "Add to Slack" button on the landing page, so that I can
    start authorization directly.
14. As a user, I want the landing page to show the `npx skills` install command,
    so that I know how to install the consuming skill.
15. As a user, I want a copy-paste snippet on the landing page that points an
    agent at the site, so that I can hand the rest of the process to an agent.
16. As an agent given only the website URL, I want a machine-readable description
    (`/llms.txt`) of how to proceed, so that I can guide the user through
    installing the skill and completing an upload without prior knowledge.
17. As the operator of the service, I want it to store nothing and log no tokens,
    so that there is no sensitive state to protect or leak.
18. As the operator, I want the service to validate that the OAuth return target
    is localhost only, so that the service cannot be turned into a token-exfil
    redirector.
19. As the operator, I want the service to be host-agnostic (12-factor: `$PORT`,
    env config, HTTPS terminated by the platform), so that I can run it on Dokku
    today and move it elsewhere without code changes.
20. As the operator, I want an optional, config-driven Plausible analytics
    integration that is off unless configured, so that I can measure usage without
    coupling the service to an analytics provider.
21. As the operator, I want to request only the `files:write` user scope, so that
    the token's blast radius is minimal.
22. As a user, I want to be able to revoke the app or re-run the login at any
    time, so that I retain control over the long-lived token.
23. As an agent, I want a clear failure message when the Keychain is locked or
    unavailable, so that I can fall back to the environment variable path or tell
    the user what to do.
24. As a maintainer, I want the service and the skill to live in one monorepo, so
    that the contract between them (callback shape, scopes, naming) is co-located.

## Implementation Decisions

**Overall shape.** A new monorepo containing two deliverables: the `sfu` service
(TypeScript) and the `slack-file-upload` skill (Python or Bash — chosen for lowest
friction at build time). The service and skill are decoupled; the only contract
between them is the OAuth handback shape and the token storage convention.

**Attribution model.** Uploads use the individual user's `xoxp-` token so files
appear as the user, in the target conversation. No bot path in v1. Scope requested
is **`files:write` only** — the Slack MCP already posts messages as the user, so
`chat:write` is not needed; `files_upload_v2` with a `channel` argument lands the
file as a message in the conversation, which is all that cohesion requires.

**Statefulness boundary.** The service is a **token-minting utility only**. It is
never in the file-transfer path, holds no database, and does not persist tokens.
It must not log tokens or the full `oauth.v2.access` response.

**Stateless OAuth handback.** The login CLI picks a free localhost port, generates
a random nonce, starts a throwaway listener, and opens
`/auth?return=http://localhost:PORT&state=NONCE`. The service encodes
`{return, nonce}` into the OAuth `state` parameter sent to Slack, so it remembers
the pending login **without server-side storage**. Slack round-trips `state` to
the service's registered HTTPS `/callback`; the service exchanges the code via
`oauth.v2.access`, reads `return` and `nonce` out of `state`, and redirects to
`http://localhost:PORT/callback?token=...&state=NONCE`. The CLI listener verifies
the nonce, extracts the token, writes it to the token store, and shuts down.

**Security constraints (hard requirements).**
- The `return` target is validated to `http://localhost` / `127.0.0.1` only; any
  other host is rejected.
- The token travels in a loopback URL query string (never leaves the machine).
  Neither the service nor the CLI logs the token or the callback URL; the service
  redirects to a clean `/success` page with no token in it.
- Only the HTTPS `/callback` is registered with Slack; the localhost hop is purely
  service-to-CLI and is not registered, so Slack's HTTPS-only rule is satisfied
  without registering many localhost ports.

**Token lifetime.** Token rotation is **off** — long-lived `xoxp-`. The service
mints and forgets; the skill never refreshes. Manual rotation = re-run login;
revocation via Slack is the kill switch.

**Token custody.** Primary store is the **macOS Keychain**, read and written via
the `security` CLI (shelling to the same binary that wrote the item, so ACLs match
and reads do not prompt — fast, non-interactive, works in a fresh shell). Fallback
is a plaintext `SLACK_USER_TOKEN` environment variable for non-GUI/headless
contexts. The token store resolves Keychain first, then env. (The `keyring` library
is explicitly avoided: it reads from a different binary and triggers a GUI prompt.)

**Distribution / discovery.** The skill is installed via `npx skills`. The agent is
the consumer and discovers the skill by its `description` frontmatter — which must
advertise the Slack file-upload capability clearly enough for an agent to reach for
it unprompted. The landing page carries: an "Add to Slack" button, the `npx skills`
install command, a `/llms.txt` for agent self-discovery, and a copy-paste snippet a
user can hand an agent. The skill's `SKILL.md` is the agent's authoritative process
guide once installed.

**Hosting.** Self-hosted on Dokku, but host-agnostic: a 12-factor container that
listens on `$PORT`, takes all config from environment variables, and relies on the
platform for HTTPS termination. No platform-specific code.

**App configuration.** Internal / single-workspace Slack app. Admin approval and
workspace installation are handled out of band by the operator.

**Modules to build.**

Service (TypeScript):
1. OAuth state codec — encode/decode `{return, nonce}` to/from the Slack `state`
   parameter. Pure, no I/O.
2. Return-URL validator — accept only `http://localhost` / `127.0.0.1`. Pure; the
   security linchpin.
3. Slack OAuth client — thin adapter over `oauth.v2.access` (code → token).
4. HTTP routes — `/auth`, `/callback`, `/`, `/llms.txt`, `/success`.
5. Landing page + `/llms.txt` — wmgid visual language; Add-to-Slack button, npx
   install command, agent snippet, machine-readable discovery doc.
6. Plausible integration — config/env-gated, off by default.

Skill (Python or Bash):
7. Token store — Keychain read/write via the `security` CLI plus
   `SLACK_USER_TOKEN` env fallback; defines the resolution order.
8. Token validity check — `auth.test` probe to decide mint-vs-reuse.
9. Login orchestration — port selection, nonce, localhost listener, open `/auth`,
   capture token, hand to the token store.
10. Uploader — `files_upload_v2` wrapper returning `{ id, permalink }`.
11. `SKILL.md` — codifies the cold-start process: detect token → guide
    install/auth → mint → store → upload.

## Testing Decisions

A good test here exercises **external behavior through a module's public
interface**, not its internals — given inputs, assert the observable output or
effect, so the test survives refactors of the implementation.

Modules to unit test (the deep, pure, high-value ones):
- **OAuth state codec (#1).** Round-trip: encoding then decoding yields the original
  `{return, nonce}`; malformed or tampered `state` is rejected cleanly.
- **Return-URL validator (#2).** `http://localhost[:port]` and `127.0.0.1` accepted;
  every other host, scheme, or embedded-credential trick rejected. This is the
  security boundary, so cover adversarial inputs explicitly.
- **Token store resolution (#7).** Keychain-present returns the Keychain value;
  Keychain-absent falls back to the env var; neither present yields a clear
  not-found signal. Shell out to a fake/stub `security` so the test is hermetic.

The Slack and HTTP adapters (#3 Slack OAuth client, #8 validity check, #10 uploader)
are integration-shaped — they wrap external APIs. They are covered by the
acceptance tests below and manual verification rather than unit tests, to avoid
asserting against mocks of someone else's API.

Prior art: none in this fresh repo; establish the convention here (pure-module unit
tests with a hermetic stub for the `security` CLI).

**Acceptance tests.**
- *Primary (skill-first):* an agent given **only the `slack-file-upload` skill** can
  guide the user through Slack app installation and authentication, then upload a
  sample MP3 to a target conversation using the minted token — the file appears as
  the user and `{ id, permalink }` is returned.
- *Secondary (website-first):* an agent given **only the `sfu` website URL** can,
  via the landing page and `/llms.txt`, guide the user through installing the skill
  and then satisfy the primary acceptance test.

## Out of Scope

- Rewiring any existing consumer skills to call this — agents pick up the skill on
  demand; consumer skills get no explicit knowledge of `sfu`.
- A bot-token (`xoxb-`) posting path — v1 is user-token only.
- An upload-proxy mode where the service handles file bytes — the service is
  token-minting only and stays out of the transfer path.
- Token rotation / refresh tokens — long-lived tokens only in v1.
- The future Sniptt-style encrypted one-time-message utility — noted as a reason the
  service is built to be extensible, but not built now.
- CI / headless / cron execution of the consuming skill — foreclosed by the
  Keychain GUI-session requirement; the env-var fallback is the only escape hatch
  and is not a first-class supported path in v1.
- Cross-platform token custody beyond macOS Keychain + env-var fallback.
- Authentication / SSO in front of the service routes — they are public and
  inherently low-risk (they only start a Slack OAuth and relay a code the caller
  already holds).

## Further Notes

- Modelled closely on [`fuzzyfox/wmgid`](https://github.com/fuzzyfox/wmgid): a
  stateless TypeScript service, OAuth-based, no DB, no logs, that surfaces a value
  and steps aside. Reuse its visual language for the landing page and its optional
  config-driven Plausible pattern.
- The hosted HTTPS endpoint exists for one reason only: Slack OAuth rejects plain
  `http://localhost` redirect URIs. Everything else about the design optimizes for
  staying as stateless and out-of-the-way as that single constraint allows.
- Slack file-upload mechanics: legacy `files.upload` is retired for new apps; the
  current flow is `files.getUploadURLExternal` → PUT bytes → `files.completeUpload`
  `External`. The `python-slack-sdk` `files_upload_v2` wrapper collapses this to one
  call and returns `{ files: [{ id, permalink }] }`.
- This is a standalone project for personal use to start with; it may later benefit
  other workflows, but carries no organizational coupling.
