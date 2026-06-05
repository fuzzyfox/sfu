/**
 * Scope safety for the Mint. Slack returns the scopes actually granted to a user
 * token in `authed_user.scope` (a comma-separated string). These helpers turn that
 * into a set and assert it carries *exactly* the scope the Service asked for —
 * `files:write` and nothing more.
 *
 * This is defence in depth (ADR-0001: the Service mints `files:write` and nothing
 * else). The `/auth` redirect already requests only `files:write`, but a
 * misconfigured Slack app or a tampered authorize request could grant a broader
 * token. We refuse to Hand back anything wider than what we asked for, so a leaked
 * token can only ever write files — never read messages, never administer.
 */

/** Parse a Slack scope string (`"files:write,chat:write"`) into a set of scopes. */
export function parseScopes(scope: string | undefined): Set<string> {
  return new Set(
    (scope ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * Assert the granted scopes exactly match the allowed set — no missing required
 * scope, and crucially no *extra* scope beyond what the Service requested. Throws
 * with a precise message on either mismatch; the caller must not Hand back a token
 * that fails this check.
 */
export function assertScopeAllowed(
  granted: string | undefined,
  allowed: Set<string>,
): void {
  const got = parseScopes(granted);

  const extra = [...got].filter((s) => !allowed.has(s)).sort();
  if (extra.length > 0) {
    throw new Error(`refusing token with unexpected scope(s): ${extra.join(', ')}`);
  }

  const missing = [...allowed].filter((s) => !got.has(s)).sort();
  if (missing.length > 0) {
    throw new Error(`refusing token missing required scope(s): ${missing.join(', ')}`);
  }
}
