import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from './config.js';

test('reads PORT from the environment', () => {
  const config = loadConfig({ PORT: '8080' });
  assert.equal(config.port, 8080);
});

test('defaults PORT to 3000 when unset', () => {
  const config = loadConfig({});
  assert.equal(config.port, 3000);
});

test('derives the Slack Redirect from BASE_URL', () => {
  const config = loadConfig({ BASE_URL: 'https://sfu.example' });
  assert.equal(config.baseUrl, 'https://sfu.example');
  assert.equal(config.slackRedirectUri, 'https://sfu.example/callback');
});

test('strips a trailing slash on BASE_URL when deriving the redirect', () => {
  const config = loadConfig({ BASE_URL: 'https://sfu.example/' });
  assert.equal(config.slackRedirectUri, 'https://sfu.example/callback');
});
