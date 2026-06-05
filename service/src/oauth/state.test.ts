import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeState, decodeState, InvalidState } from './state.js';

test('round-trips a pending Login through encode then decode', () => {
  const login = { returnUrl: 'http://localhost:54321', nonce: 'abc123' };

  const decoded = decodeState(encodeState(login));

  assert.deepEqual(decoded, login);
});

test('rejects state that is not valid base64url JSON', () => {
  assert.throws(() => decodeState('!!! not base64 !!!'), InvalidState);
  assert.throws(() => decodeState(Buffer.from('not json', 'utf8').toString('base64url')), InvalidState);
});

test('rejects state whose JSON is missing returnUrl or nonce', () => {
  const noReturn = Buffer.from(JSON.stringify({ nonce: 'n' }), 'utf8').toString('base64url');
  const noNonce = Buffer.from(JSON.stringify({ returnUrl: 'http://localhost' }), 'utf8').toString('base64url');

  assert.throws(() => decodeState(noReturn), InvalidState);
  assert.throws(() => decodeState(noNonce), InvalidState);
});
