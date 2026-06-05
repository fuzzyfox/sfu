import type { AnalyticsEvent, TrackEvent } from './track.js';

/** Everything the Plausible sender needs. `fetch` is injected for testability. */
export interface PlausibleTrackerDeps {
  /** The `data-domain` the site is registered under in Plausible. */
  domain: string;
  /** Base URL of the Plausible Events API (hosted or self-hosted). */
  apiHost: string;
  /** HTTP client; defaults to the global `fetch` in production. */
  fetch?: typeof globalThis.fetch;
}

/**
 * Build a {@link TrackEvent} that records events via Plausible's server-side
 * Events API (`POST /api/event`). The visitor IP and User-Agent are forwarded so
 * Plausible's bot filter accepts the event and counts it; Plausible hashes the IP
 * with a daily-rotating salt and stores no raw IP, and the Service itself keeps
 * nothing (ADR-0001). Every send is fire-and-forget: failures are swallowed and
 * never delay or break the Login (issue #9).
 */
export function makePlausibleTracker(deps: PlausibleTrackerDeps): TrackEvent {
  const fetch = deps.fetch ?? globalThis.fetch;
  const endpoint = new URL('/api/event', deps.apiHost).toString();

  return (event: AnalyticsEvent): void => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (event.ip) headers['x-forwarded-for'] = event.ip;
    if (event.userAgent) headers['user-agent'] = event.userAgent;

    try {
      void fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: event.name, url: event.url, domain: deps.domain }),
      }).catch(() => {
        // Fire-and-forget: a Plausible outage must never affect the Login.
      });
    } catch {
      // A synchronously throwing fetch is swallowed too.
    }
  };
}
