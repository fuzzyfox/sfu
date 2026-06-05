import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { Home } from './views/home.js';
import { Privacy, Terms, Support } from './views/legal.js';
import { llmsTxt } from './content.js';
import type { PlausibleConfig } from './config.js';
import type { Context } from 'hono';
import { mountOAuthRoutes, type OAuthDeps } from './oauth/routes.js';

/** Optional, non-OAuth wiring for the app. */
export interface AppOptions {
  /** When set, the landing page injects the Plausible client script (issue #9). */
  plausible?: PlausibleConfig;
}

/**
 * The scheme+host the request reached the *user* on, used to build the absolute
 * links the pages emit (Open Graph image, `/llms.txt` auth URL, …).
 *
 * Behind the reverse proxy the app speaks plain HTTP, so `c.req.url` is `http://`
 * even though the public site is HTTPS. The proxy records the original scheme in
 * `X-Forwarded-Proto`; honouring it keeps emitted URLs `https://`, which social
 * unfurlers (Slack, X) require for the card image.
 */
function reqOrigin(c: Context): string {
  const url = new URL(c.req.url);
  const forwarded = c.req.header('x-forwarded-proto');
  if (forwarded) url.protocol = `${forwarded.split(',')[0].trim()}:`;
  return url.origin;
}

/**
 * Build the sfu HTTP application.
 *
 * Serves the public landing page and agent-discovery surface (`/llms.txt`), plus
 * the OAuth routes (`/auth`, `/callback`, `/success`) that drive a Login. The
 * Slack-facing dependency (`mintToken`) is injected via {@link OAuthDeps} so the
 * routes are testable without touching Slack, and so the Service itself stays a
 * thin, stateless front over the OAuth flow (ADR-0001).
 */
export function createApp(deps: OAuthDeps, options: AppOptions = {}): Hono {
  const app = new Hono();

  // Compiled Tailwind CSS and Alpine.js, emitted into ./public by the build.
  app.get('/public/*', serveStatic({ root: './' }));

  app.get('/', (c) => c.html(<Home origin={reqOrigin(c)} plausible={options.plausible} />));
  app.get('/llms.txt', (c) => c.text(llmsTxt(reqOrigin(c))));

  // Static legal + support surface (public URLs the Slack Marketplace listing needs).
  app.get('/privacy', (c) => c.html(<Privacy origin={reqOrigin(c)} />));
  app.get('/terms', (c) => c.html(<Terms origin={reqOrigin(c)} />));
  app.get('/support', (c) => c.html(<Support origin={reqOrigin(c)} />));

  mountOAuthRoutes(app, deps);

  return app;
}
