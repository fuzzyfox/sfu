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

test('analytics is off when PLAUSIBLE_DOMAIN is unset', () => {
  const config = loadConfig({});
  assert.equal(config.plausible, undefined);
});

test('analytics is off when PLAUSIBLE_DOMAIN is empty', () => {
  const config = loadConfig({ PLAUSIBLE_DOMAIN: '' });
  assert.equal(config.plausible, undefined);
});

test('when PLAUSIBLE_DOMAIN is set, analytics carries domain plus default script src and API host', () => {
  const config = loadConfig({ PLAUSIBLE_DOMAIN: 'sfu.example' });
  assert.deepEqual(config.plausible, {
    domain: 'sfu.example',
    scriptSrc: 'https://plausible.io/js/script.tagged-events.js',
    apiHost: 'https://plausible.io',
  });
});

test('PLAUSIBLE_SRC and PLAUSIBLE_API_HOST override the defaults (self-hosting)', () => {
  const config = loadConfig({
    PLAUSIBLE_DOMAIN: 'sfu.example',
    PLAUSIBLE_SRC: 'https://plausible.self.host/js/script.js',
    PLAUSIBLE_API_HOST: 'https://plausible.self.host',
  });
  assert.equal(config.plausible?.scriptSrc, 'https://plausible.self.host/js/script.js');
  assert.equal(config.plausible?.apiHost, 'https://plausible.self.host');
});
