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
