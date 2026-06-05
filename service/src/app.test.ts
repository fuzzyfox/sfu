import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from './app.js';

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

test('GET / offers an Add to Slack affordance that starts authorization at /auth', async () => {
  const body = await (await app.request('/')).text();
  assert.match(body, /Add to Slack/i);
  assert.match(body, /href="\/auth"/);
});

test('GET / shows the npx command that installs the consuming Skill', async () => {
  const body = await (await app.request('/')).text();
  assert.match(body, /npx skills install slack-file-upload/);
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

test('GET /llms.txt is a plain-text doc an Agent can act on from the URL alone', async () => {
  const res = await app.request('http://example.test/llms.txt');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/plain/);

  const body = await res.text();
  // The whole cold-start path, machine-readable: authorize, install, upload.
  assert.match(body, /\/auth/); // start authorization
  assert.match(body, /npx skills install slack-file-upload/); // install the Skill
  assert.match(body, /upload/i); // then perform an Upload
  // Absolute, served-from-this-host links so the Agent can navigate.
  assert.match(body, /http:\/\/example\.test\/auth/);
});
