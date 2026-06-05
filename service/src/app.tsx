import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { Home } from './views/home.js';
import { llmsTxt } from './content.js';

/**
 * The sfu HTTP application.
 *
 * Serves the public landing page and the agent-discovery surface (`/llms.txt`),
 * from which both Users and Agents can discover and drive the whole Login →
 * Upload flow. The OAuth routes (`/auth`, the Slack Redirect) land in later work.
 */
export const app = new Hono();

// Compiled Tailwind CSS and Alpine.js, emitted into ./public by the build.
app.get('/public/*', serveStatic({ root: './' }));

app.get('/', (c) => c.html(<Home origin={new URL(c.req.url).origin} />));

app.get('/llms.txt', (c) => c.text(llmsTxt(new URL(c.req.url).origin)));
