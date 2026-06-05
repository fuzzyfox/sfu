import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScopes, assertScopeAllowed } from './scope.js';

test('parseScopes splits a comma list, trimming and dropping blanks', () => {
  assert.deepEqual(
    [...parseScopes(' files:write , chat:write ,')],
    ['files:write', 'chat:write'],
  );
});

test('parseScopes treats undefined and empty as no scopes', () => {
  assert.equal(parseScopes(undefined).size, 0);
  assert.equal(parseScopes('').size, 0);
});

const allowed = new Set(['files:write']);

test('assertScopeAllowed accepts exactly the requested scope', () => {
  assert.doesNotThrow(() => assertScopeAllowed('files:write', allowed));
});

test('assertScopeAllowed refuses a token that carries an extra scope', () => {
  // The safety: even though files:write is present, a broader grant is refused
  // rather than Handed back.
  assert.throws(
    () => assertScopeAllowed('files:write,chat:write', allowed),
    /unexpected scope\(s\): chat:write/,
  );
});

test('assertScopeAllowed lists every extra scope, sorted, in the refusal', () => {
  assert.throws(
    () => assertScopeAllowed('admin,files:write,users:read', allowed),
    /unexpected scope\(s\): admin, users:read/,
  );
});

test('assertScopeAllowed refuses a token missing the required scope', () => {
  assert.throws(
    () => assertScopeAllowed('chat:write', allowed),
    /unexpected scope\(s\): chat:write/,
  );
  assert.throws(() => assertScopeAllowed(undefined, allowed), /missing required scope\(s\): files:write/);
  assert.throws(() => assertScopeAllowed('', allowed), /missing required scope\(s\): files:write/);
});
