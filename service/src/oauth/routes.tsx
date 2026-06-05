import type { Hono } from 'hono';
import { Success } from '../views/success.js';
import { encodeState, decodeState, InvalidState } from './state.js';
import { isValidReturnUrl } from './returnUrl.js';

/**
 * Everything the OAuth routes need from the outside world. `mintToken` is the only
 * I/O collaborator — a thin adapter over Slack's `oauth.v2.access` — so the routes
 * stay testable without touching Slack. The rest is static config sourced from the
 * environment (ADR-0001: the Service holds no state of its own).
 */
export interface OAuthDeps {
  /** Slack app client id, sent on the authorize redirect. */
  clientId: string;
  /** The registered HTTPS Slack Redirect, e.g. `https://sfu.wduyck.me/callback`. */
  redirectUri: string;
  /** Slack's authorize endpoint base, `https://slack.com/oauth/v2/authorize`. */
  authorizeUrl: string;
  /** The minimal user scope requested — `files:write`. */
  userScope: string;
  /** Exchange an authorization `code` for a user token (Mint). */
  mintToken: (code: string) => Promise<string>;
}

/**
 * Mount the three OAuth routes that make up a Login:
 *
 * - `GET /auth?return=…&state=NONCE` — validate the loopback Return URL, pack
 *   `{returnUrl, nonce}` into the OAuth `state`, and redirect the User to Slack.
 * - `GET /callback?code=…&state=…` — Slack Hands the `code` back here; decode and
 *   re-validate `state`, Mint the token, and Hand back to the loopback Listener.
 * - `GET /success` — the clean landing page with no token in it.
 */
export function mountOAuthRoutes(app: Hono, deps: OAuthDeps): void {
  app.get('/auth', (c) => {
    const returnUrl = c.req.query('return');
    const nonce = c.req.query('state');
    if (!returnUrl || !nonce || !isValidReturnUrl(returnUrl)) {
      return c.text('Invalid return target', 400);
    }

    const authorize = new URL(deps.authorizeUrl);
    authorize.searchParams.set('client_id', deps.clientId);
    authorize.searchParams.set('user_scope', deps.userScope);
    authorize.searchParams.set('redirect_uri', deps.redirectUri);
    authorize.searchParams.set('state', encodeState({ returnUrl, nonce }));
    return c.redirect(authorize.toString());
  });

  app.get('/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    if (!code || !state) {
      return c.text('Missing code or state', 400);
    }

    let pending;
    try {
      pending = decodeState(state);
    } catch (err) {
      if (err instanceof InvalidState) return c.text('Invalid state', 400);
      throw err;
    }

    // Defence in depth: re-validate the decoded Return URL before Handing a token
    // anywhere. This is the exfiltration boundary (ADR-0002).
    if (!isValidReturnUrl(pending.returnUrl)) {
      return c.text('Invalid return target', 400);
    }

    const token = await deps.mintToken(code);

    const handback = new URL('/callback', pending.returnUrl);
    handback.searchParams.set('token', token);
    handback.searchParams.set('state', pending.nonce);
    return c.redirect(handback.toString());
  });

  app.get('/success', (c) => c.html(<Success />));
}
