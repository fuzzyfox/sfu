import { Hono } from 'hono';

/**
 * The sfu HTTP application.
 *
 * Walking-skeleton stage: a single placeholder landing route so the container
 * is demonstrably alive end-to-end (build → run → HTTP 200). The OAuth routes
 * (`/auth`, `/callback`, `/success`, `/llms.txt`) land in later work.
 */
export const app = new Hono();

app.get('/', (c) => c.text('sfu — Slack File Upload\n'));
