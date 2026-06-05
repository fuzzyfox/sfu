import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { Home } from './views/home.js';
import { llmsTxt } from './content.js';
import { mountOAuthRoutes, type OAuthDeps } from './oauth/routes.js';

/**
 * Build the sfu HTTP application.
 *
 * Serves the public landing page and agent-discovery surface (`/llms.txt`), plus
 * the OAuth routes (`/auth`, `/callback`, `/success`) that drive a Login. The
 * Slack-facing dependency (`mintToken`) is injected via {@link OAuthDeps} so the
 * routes are testable without touching Slack, and so the Service itself stays a
 * thin, stateless front over the OAuth flow (ADR-0001).
 */
export function createApp(deps: OAuthDeps): Hono {
  const app = new Hono();

  // Compiled Tailwind CSS and Alpine.js, emitted into ./public by the build.
  app.get('/public/*', serveStatic({ root: './' }));

  app.get('/', (c) => c.html(<Home origin={new URL(c.req.url).origin} />));
  app.get('/llms.txt', (c) => c.text(llmsTxt(new URL(c.req.url).origin)));

  mountOAuthRoutes(app, deps);

  return app;
}
