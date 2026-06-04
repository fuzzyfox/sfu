# Token custody: macOS Keychain via the `security` CLI

The Token Store is the macOS Keychain (primary) with a `SLACK_USER_TOKEN`
environment variable fallback, resolved Keychain-first. The Skill reads and writes
the Keychain by **shelling out to the `security` CLI**, deliberately *not* via the
`keyring` Python library.

## Why the `security` CLI and not `keyring`

Keychain ACLs are per-binary. A process that reads with the *same* `security` binary
that wrote the item inherits the trusted-app identity and is **never prompted**
(~18ms, works in a fresh shell). The `keyring` library reads via the Security
framework from the `python3` binary — a different app — which triggers a one-time
"Always Allow" GUI prompt, and it isn't installed by default. Shelling to `security`
keeps the flow non-interactive after the one-time Authorize.

## Constraint (not visible in the code)

All of this requires an **unlocked login Keychain in a GUI desktop session**.
Headless / SSH / cron runs fail with `User interaction is not allowed`. This pins the
Skill to the User's own logged-in Mac; the `SLACK_USER_TOKEN` env-var fallback is the
only escape hatch for non-GUI contexts and is not a first-class supported path.
Long-lived tokens (rotation off) keep this simple: mint once, no client-side refresh.
