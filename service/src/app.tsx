import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { Home } from './views/home.js';
import { Privacy, Terms, Support } from './views/legal.js';
import { llmsTxt } from './content.js';
import type { PlausibleConfig } from './config.js';
import { mountOAuthRoutes, type OAuthDeps } from './oauth/routes.js';

/** Optional, non-OAuth wiring for the app. */
export interface AppOptions {
  /** When set, the landing page injects the Plausible client script (issue #9). */
  plausible?: PlausibleConfig;
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

  // The landing "Add to Slack" button goes straight to Slack's authorize screen
  // (a direct install), not the CLI-driven `/auth` flow. Built from config so the
  // public client id and scope are never hardcoded in a view.
  const addToSlackUrl = (() => {
    const u = new URL(deps.authorizeUrl);
    u.searchParams.set('client_id', deps.clientId);
    u.searchParams.set('scope', '');
    u.searchParams.set('user_scope', deps.userScope);
    return u.toString();
  })();

  app.get('/', (c) =>
    c.html(
      <Home
        origin={new URL(c.req.url).origin}
        addToSlackUrl={addToSlackUrl}
        plausible={options.plausible}
      />,
    ),
  );
  app.get('/llms.txt', (c) => c.text(llmsTxt(new URL(c.req.url).origin)));

  // Static legal + support surface (public URLs the Slack Marketplace listing needs).
  app.get('/privacy', (c) => c.html(<Privacy />));
  app.get('/terms', (c) => c.html(<Terms />));
  app.get('/support', (c) => c.html(<Support />));

  mountOAuthRoutes(app, deps);

  return app;
}
