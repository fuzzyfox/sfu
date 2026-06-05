import { WebClient } from '@slack/web-api';
import { assertScopeAllowed, parseScopes } from './scope.js';

/**
 * The Slack OAuth client — a thin adapter over `oauth.v2.access` that turns an
 * authorization `code` into a user token (the Mint). This is the Service's only
 * outbound Slack call in the Login flow. It is integration-shaped (it wraps
 * someone else's API) and so is covered by acceptance testing, not unit tests.
 *
 * Hard constraint (ADR-0002): never log the token or the full `oauth.v2.access`
 * response. This adapter returns only the token string and keeps the response
 * internal.
 *
 * Safety (ADR-0001): the Service mints `files:write` and nothing else. After
 * exchanging the code we assert the *granted* scope is exactly `expectedScope`
 * before Handing the token back — a broader grant is refused, never returned.
 */
export function makeSlackMinter(opts: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** The only scope this token may carry — `files:write`. */
  expectedScope: string;
}): (code: string) => Promise<string> {
  const allowed = parseScopes(opts.expectedScope);
  const client = new WebClient();
  return async (code: string) => {
    const res = await client.oauth.v2.access({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.redirectUri,
      code,
    });
    // The user token lives under `authed_user.access_token` for user-scoped installs.
    const token = res.authed_user?.access_token;
    if (!token) {
      throw new Error('oauth.v2.access returned no user token');
    }
    // Refuse to Hand back a token that carries more (or less) than `files:write`.
    assertScopeAllowed(res.authed_user?.scope, allowed);
    return token;
  };
}
