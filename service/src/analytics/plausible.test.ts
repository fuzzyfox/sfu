import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePlausibleTracker } from './plausible.js';

type Call = { url: string; init: RequestInit };

function recordingFetch() {
  const calls: Call[] = [];
  const fetch = ((url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(new Response('{}', { status: 202 }));
  }) as unknown as typeof globalThis.fetch;
  return { calls, fetch };
}

test('POSTs the event to the Plausible Events API with the configured domain', async () => {
  const { calls, fetch } = recordingFetch();
  const track = makePlausibleTracker({
    domain: 'sfu.example',
    apiHost: 'https://plausible.io',
    fetch,
  });

  track({ name: 'Login Started', url: 'https://sfu.example/auth' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, 'https://plausible.io/api/event');
  assert.equal(calls[0]?.init.method, 'POST');
  const body = JSON.parse(calls[0]?.init.body as string);
  assert.deepEqual(body, {
    name: 'Login Started',
    url: 'https://sfu.example/auth',
    domain: 'sfu.example',
  });
});

test('forwards the visitor IP and User-Agent so Plausible accepts the event', async () => {
  const { calls, fetch } = recordingFetch();
  const track = makePlausibleTracker({
    domain: 'sfu.example',
    apiHost: 'https://plausible.io',
    fetch,
  });

  track({
    name: 'Login Started',
    url: 'https://sfu.example/auth',
    ip: '203.0.113.7',
    userAgent: 'Mozilla/5.0 (Test)',
  });

  const headers = new Headers(calls[0]?.init.headers);
  assert.equal(headers.get('x-forwarded-for'), '203.0.113.7');
  assert.equal(headers.get('user-agent'), 'Mozilla/5.0 (Test)');
  assert.match(headers.get('content-type') ?? '', /application\/json/);
});

test('is fire-and-forget: a rejected request never throws into the caller', () => {
  const fetch = (() => Promise.reject(new Error('network down'))) as unknown as typeof globalThis.fetch;
  const track = makePlausibleTracker({ domain: 'sfu.example', apiHost: 'https://plausible.io', fetch });

  assert.doesNotThrow(() => track({ name: 'Login Started', url: 'https://sfu.example/auth' }));
});

test('is fire-and-forget: a synchronously throwing fetch never throws into the caller', () => {
  const fetch = (() => {
    throw new Error('boom');
  }) as unknown as typeof globalThis.fetch;
  const track = makePlausibleTracker({ domain: 'sfu.example', apiHost: 'https://plausible.io', fetch });

  assert.doesNotThrow(() => track({ name: 'Login Started', url: 'https://sfu.example/auth' }));
});
