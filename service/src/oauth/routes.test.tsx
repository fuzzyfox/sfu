import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import type { OAuthDeps } from './routes.js';
import { encodeState, decodeState } from './state.js';

/** Test deps: a stub minter that never touches Slack. */
function testApp(overrides: Partial<OAuthDeps> = {}) {
  const deps: OAuthDeps = {
    clientId: 'test-client-id',
    redirectUri: 'https://sfu.example/callback',
    authorizeUrl: 'https://slack.example/oauth/v2/authorize',
    userScope: 'files:write',
    mintToken: async () => 'xoxp-minted',
    ...overrides,
  };
  return createApp(deps);
}

test('GET /success returns a clean page that contains no token', async () => {
  const app = testApp();

  const res = await app.request('/success');

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const body = await res.text();
  assert.doesNotMatch(body, /xoxp-/);
});

test('GET /auth redirects a valid loopback return to Slack authorize with packed state', async () => {
  const app = testApp();

  const res = await app.request('/auth?return=http://localhost:54321&state=nonce-xyz');

  assert.equal(res.status, 302);
  const location = new URL(res.headers.get('location') ?? '');
  // Points at the configured Slack authorize endpoint with the minimal scope.
  assert.equal(location.origin + location.pathname, 'https://slack.example/oauth/v2/authorize');
  assert.equal(location.searchParams.get('client_id'), 'test-client-id');
  assert.equal(location.searchParams.get('user_scope'), 'files:write');
  assert.equal(location.searchParams.get('redirect_uri'), 'https://sfu.example/callback');
  // The pending Login round-trips inside `state`.
  assert.deepEqual(decodeState(location.searchParams.get('state') ?? ''), {
    returnUrl: 'http://localhost:54321',
    nonce: 'nonce-xyz',
  });
});

test('GET /auth rejects a non-loopback return target', async () => {
  const app = testApp();

  const res = await app.request('/auth?return=https://evil.com&state=nonce-xyz');

  assert.equal(res.status, 400);
});

test('GET /auth with no return (a human clicking Add to Slack) guides them to the CLI', async () => {
  const app = testApp();

  const res = await app.request('/auth');

  // Not an error and not a redirect to Slack — a human has no loopback Listener,
  // so we explain the real entry point rather than failing or minting nowhere.
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const body = await res.text();
  assert.match(body, /npx skills add fuzzyfox\/sfu/);
  assert.match(body, /slack-login/);
});

test('GET /callback Mints the code and Hands back to the loopback Listener', async () => {
  let mintedCode: string | undefined;
  const app = testApp({
    mintToken: async (code) => {
      mintedCode = code;
      return 'xoxp-the-token';
    },
  });
  const state = encodeState({ returnUrl: 'http://localhost:54321', nonce: 'nonce-xyz' });

  const res = await app.request(`/callback?code=auth-code-123&state=${state}`);

  assert.equal(mintedCode, 'auth-code-123');
  assert.equal(res.status, 302);
  const handback = new URL(res.headers.get('location') ?? '');
  assert.equal(handback.origin, 'http://localhost:54321');
  assert.equal(handback.pathname, '/callback');
  assert.equal(handback.searchParams.get('token'), 'xoxp-the-token');
  assert.equal(handback.searchParams.get('state'), 'nonce-xyz');
});

test('GET /callback rejects tampered/malformed state without Minting', async () => {
  let minted = false;
  const app = testApp({
    mintToken: async () => {
      minted = true;
      return 'xoxp-nope';
    },
  });

  const res = await app.request('/callback?code=auth-code-123&state=!!!garbage!!!');

  assert.equal(res.status, 400);
  assert.equal(minted, false);
});

test('GET /callback re-validates the decoded return and refuses a smuggled host', async () => {
  let minted = false;
  const app = testApp({
    mintToken: async () => {
      minted = true;
      return 'xoxp-nope';
    },
  });
  // A state whose returnUrl is a non-loopback host — decodes fine, must still be refused.
  const evilState = encodeState({ returnUrl: 'https://evil.com', nonce: 'nonce-xyz' });

  const res = await app.request(`/callback?code=auth-code-123&state=${evilState}`);

  assert.equal(res.status, 400);
  assert.equal(minted, false);
});
