import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveClientIp } from './clientIp.js';

test('prefers Cloudflare CF-Connecting-IP as the source of truth', () => {
  const ip = resolveClientIp({
    cfConnectingIp: '203.0.113.7',
    forwardedFor: '198.51.100.1, 70.41.3.18',
    remoteAddr: '10.0.0.1',
  });
  assert.equal(ip, '203.0.113.7');
});

test('falls back to the first hop of X-Forwarded-For when no Cloudflare header', () => {
  const ip = resolveClientIp({
    forwardedFor: '198.51.100.1, 70.41.3.18',
    remoteAddr: '10.0.0.1',
  });
  assert.equal(ip, '198.51.100.1');
});

test('falls back to the direct remote address when no proxy headers', () => {
  const ip = resolveClientIp({ remoteAddr: '10.0.0.1' });
  assert.equal(ip, '10.0.0.1');
});

test('ignores empty/whitespace header values', () => {
  const ip = resolveClientIp({
    cfConnectingIp: '   ',
    forwardedFor: ' , 70.41.3.18',
    remoteAddr: '10.0.0.1',
  });
  assert.equal(ip, '70.41.3.18');
});

test('returns undefined when nothing is available', () => {
  assert.equal(resolveClientIp({}), undefined);
});
