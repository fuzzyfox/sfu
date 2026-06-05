import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

// Landing-page behaviour is independent of the OAuth wiring; a stub minter suffices.
const app = createApp({
  clientId: 'test-client-id',
  redirectUri: 'https://sfu.example/callback',
  authorizeUrl: 'https://slack.example/oauth/v2/authorize',
  userScope: 'files:write',
  mintToken: async () => 'xoxp-minted',
});

test('GET / responds 200 so the running container is demonstrably alive', async () => {
  const res = await app.request('/');
  assert.equal(res.status, 200);
});

test('GET / serves an HTML landing page explaining what sfu is', async () => {
  const res = await app.request('/');
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const body = await res.text();
  // Explains the product: files uploaded to Slack as the User.
  assert.match(body, /Upload files to Slack/i);
});

test('GET / has no direct authorize button — authorization is CLI-driven', async () => {
  const body = await (await app.request('/')).text();
  assert.doesNotMatch(body, /Add to Slack/i);
  assert.doesNotMatch(body, /oauth\/v2\/authorize/);
});

test('GET / shows the npx command that installs the consuming Skill', async () => {
  const body = await (await app.request('/')).text();
  assert.match(body, /npx skills add fuzzyfox\/sfu/);
});

test('GET / carries a copy-paste Agent snippet pointing at the site and /llms.txt', async () => {
  const body = await (await app.request('http://example.test/')).text();
  // Links to the machine-readable discovery doc.
  assert.match(body, /href="\/llms\.txt"/);
  // The snippet tells an Agent to read /llms.txt at this very site and drive the
  // install + Upload — and uses the origin the page was served from.
  assert.match(body, /http:\/\/example\.test\/llms\.txt/);
  assert.match(body, /install.*slack-file-upload/i);
});

test('GET / emits no Plausible script when analytics is unconfigured', async () => {
  const body = await (await app.request('/')).text();
  assert.doesNotMatch(body, /plausible/i);
  assert.doesNotMatch(body, /data-domain/);
});

test('GET / injects the Plausible script on the landing page when configured', async () => {
  const tracked = createApp(
    {
      clientId: 'test-client-id',
      redirectUri: 'https://sfu.example/callback',
      authorizeUrl: 'https://slack.example/oauth/v2/authorize',
      userScope: 'files:write',
      mintToken: async () => 'xoxp-minted',
    },
    {
      plausible: {
        domain: 'sfu.example',
        scriptSrc: 'https://plausible.io/js/script.tagged-events.js',
        apiHost: 'https://plausible.io',
      },
    },
  );
  const body = await (await tracked.request('/')).text();
  assert.match(body, /<script[^>]+data-domain="sfu\.example"/);
  assert.match(body, /src="https:\/\/plausible\.io\/js\/script\.tagged-events\.js"/);
  assert.match(body, /defer/);
});

const trackedApp = createApp(
  {
    clientId: 'test-client-id',
    redirectUri: 'https://sfu.example/callback',
    authorizeUrl: 'https://slack.example/oauth/v2/authorize',
    userScope: 'files:write',
    mintToken: async () => 'xoxp-minted',
  },
  {
    plausible: {
      domain: 'sfu.example',
      scriptSrc: 'https://plausible.io/js/script.tagged-events.js',
      apiHost: 'https://plausible.io',
    },
  },
);

test('GET / tags the copy buttons as Plausible events when configured', async () => {
  const body = await (await trackedApp.request('/')).text();
  assert.match(body, /plausible-event-name=Copy\+Install/);
  assert.match(body, /plausible-event-name=Copy\+Snippet/);
});

test('GET / carries no Plausible event tags when analytics is unconfigured', async () => {
  const body = await (await app.request('/')).text();
  assert.doesNotMatch(body, /plausible-event-name/);
});

for (const [path, heading] of [
  ['/privacy', /Privacy Policy/i],
  ['/terms', /Terms of Service/i],
  ['/support', /Support/i],
] as const) {
  test(`GET ${path} serves an HTML legal/support page (public URL the Marketplace needs)`, async () => {
    const res = await app.request(path);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    assert.match(await res.text(), heading);
  });
}

test('the landing footer links to the privacy, terms, and support pages', async () => {
  const body = await (await app.request('/')).text();
  assert.match(body, /href="\/privacy"/);
  assert.match(body, /href="\/terms"/);
  assert.match(body, /href="\/support"/);
});

test('GET /llms.txt is a plain-text doc an Agent can act on from the URL alone', async () => {
  const res = await app.request('http://example.test/llms.txt');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/plain/);

  const body = await res.text();
  // The whole cold-start path, machine-readable: authorize, install, upload.
  assert.match(body, /\/auth/); // start authorization
  assert.match(body, /npx skills add fuzzyfox\/sfu/); // install the Skill
  assert.match(body, /upload/i); // then perform an Upload
  // Absolute, served-from-this-host links so the Agent can navigate.
  assert.match(body, /http:\/\/example\.test\/auth/);
});
