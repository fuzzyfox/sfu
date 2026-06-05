# Plausible analytics — config-gated, hybrid, no tokens or PII

The Service ships an **optional** Plausible analytics integration to learn how the
landing page and Login flow are used. It is **off unless configured**: with no
`PLAUSIBLE_DOMAIN` set, no client script is emitted and the server-side tracker is a
no-op, so the Service behaves exactly as it did before (issue #9). It stays true to
ADR-0001 — the Service still stores nothing of its own.

A hard rule governs the design: **no User token, Slack authorization `code`, return
URL, nonce, or other PII may ever reach analytics.**

## Decision

A **hybrid** split, each technique used only where it is safe:

- **Client script — landing page (`/`) only.** Plausible's `script.tagged-events.js`
  is injected by `Layout`, but only `Home` passes the config, so the script never
  loads on a page whose URL could carry a secret. It tracks the landing pageview plus
  three tagged clicks: **Add to Slack**, **Copy Install**, **Copy Snippet**.
- **Server-side Events API — the Login flow.** A fire-and-forget `trackEvent`
  collaborator (injected like `mintToken`) emits **Login Started** on `/auth` and
  **Login Completed** on a successful `/callback` Mint. The event `url` is a clean
  path the Service builds itself (`${baseUrl}/auth`), never the live request URL — so
  the `code`, return URL, nonce and token are *structurally* unable to reach Plausible.

### Why server-side for the flow, not client script

`/auth?return=…&state=…` and `/callback?code=…` are 302 redirects that render no
HTML, so a client script could not run there anyway — and we would not want it to,
since those URLs carry secrets. Counting the flow server-side from hand-built URLs is
both the only option and the safe one.

### Visitor IP

Plausible counts via a salted hash of User-Agent + IP and **drops events that lack a
real client IP** (bot filter). The Service runs behind Cloudflare, so the IP is
resolved `CF-Connecting-IP` → first hop of `X-Forwarded-For` → direct remote address
and forwarded to Plausible as `X-Forwarded-For`. Plausible hashes it with a
daily-rotating salt and stores **no raw IP**; the Service stores nothing. An Operator
who wants the IP to stay in-house can point `PLAUSIBLE_API_HOST` at a self-hosted
Plausible.

## Configuration

| Env | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PLAUSIBLE_DOMAIN` | gate | — | The `data-domain`. Unset ⇒ analytics off. |
| `PLAUSIBLE_SRC` | no | `https://plausible.io/js/script.tagged-events.js` | Client script URL. |
| `PLAUSIBLE_API_HOST` | no | `https://plausible.io` | Server Events API base (self-host override). |

HITL: the hosting-side Plausible site and these env values are provisioned by the
Operator.

## Tracked events

| Event | Where | Surface |
| --- | --- | --- |
| Landing pageview | `/` | client |
| `Add to Slack` | `/` button → `/auth` | client (tagged) |
| `Copy Install` | `/` npx copy button | client (tagged) |
| `Copy Snippet` | `/` agent-snippet copy button | client (tagged) |
| `Login Started` | served `/auth` flow | server |
| `Login Completed` | successful `/callback` Mint | server |

**Never tracked:** User tokens, Slack `code`, return URL, nonce, query strings, or any
other PII.

## Consequences

Analytics is best-effort and entirely severable: a Plausible outage cannot delay or
break a Login. Adding or renaming an event is a one-line change at the seam. The
Service's "stores nothing" guarantee is preserved — the only new data leaving the
Service is a per-flow event with a hashed-and-discarded IP at a privacy-first
processor.
