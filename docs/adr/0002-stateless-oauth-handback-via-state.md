# Stateless OAuth handback via the `state` parameter

The `slack-login` CLI picks a free localhost port, generates a nonce, starts a
Listener, and opens `/auth?return=http://localhost:PORT&state=NONCE`. The Service
encodes `{return, nonce}` **into the OAuth `state` parameter** it sends to Slack.
Slack round-trips `state` verbatim to the registered HTTPS Slack Redirect, so the
Service can complete the Handback **without any server-side session storage** — it
reads the return target back out of `state`, Mints the token, and redirects it to the
Listener.

This is what lets the Service stay stateless (ADR-0001) while still routing each
token back to the specific CLI instance that started the Login.

## Consequences

- **Security boundary:** the `return` value MUST be validated to
  `http://localhost` / `127.0.0.1` only. Without this, `/auth?return=https://evil`
  turns the Service into a token-exfiltration redirector. This validation is the
  single most important piece of code in the Service.
- The token travels in a loopback URL query string. It never leaves the machine, but
  neither the Service nor the CLI may log the token or the Handback URL; the Service
  redirects to a clean `/success` page with no token in it.
- Only the HTTPS Slack Redirect is registered with Slack; the localhost Handback is
  internal (Service → CLI) and is never registered, so Slack's HTTPS-only rule holds
  without registering many localhost ports.
