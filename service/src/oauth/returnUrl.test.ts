import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidReturnUrl } from './returnUrl.js';

test('accepts http://localhost with any port', () => {
  assert.equal(isValidReturnUrl('http://localhost'), true);
  assert.equal(isValidReturnUrl('http://localhost:54321'), true);
  assert.equal(isValidReturnUrl('http://127.0.0.1:8080'), true);
});

test('rejects non-loopback hosts', () => {
  for (const value of [
    'http://evil.com',
    'http://evil.com:54321',
    'http://localhost.evil.com', // suffix trick
    'http://notlocalhost',
    'http://0.0.0.0',
    'http://[::1]', // ipv6 loopback not in the allowlist
    'http://10.0.0.1',
  ]) {
    assert.equal(isValidReturnUrl(value), false, value);
  }
});

test('rejects non-http schemes', () => {
  for (const value of [
    'https://localhost', // https loopback is still not how the Handback works
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:text/html,evil',
    'ftp://localhost',
  ]) {
    assert.equal(isValidReturnUrl(value), false, value);
  }
});

test('rejects embedded-credential tricks that smuggle a foreign host', () => {
  for (const value of [
    'http://localhost@evil.com',
    'http://user:pass@evil.com',
    'http://127.0.0.1@evil.com',
    'http://evil.com#@localhost',
  ]) {
    assert.equal(isValidReturnUrl(value), false, value);
  }
});

test('rejects junk that is not a URL at all', () => {
  for (const value of ['', 'localhost', 'not a url', '//localhost']) {
    assert.equal(isValidReturnUrl(value), false, value);
  }
});
