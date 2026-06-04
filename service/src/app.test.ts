import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from './app.js';

test('GET / responds 200 so the running container is demonstrably alive', async () => {
  const res = await app.request('/');
  assert.equal(res.status, 200);
});
