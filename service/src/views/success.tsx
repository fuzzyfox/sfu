import type { FC } from 'hono/jsx';
import { Layout } from './layout.js';

/**
 * The clean end-of-Login page. The browser lands here AFTER the Listener has
 * received the Handback, written the token to the Token Store, and shut down — so
 * this page must contain no token (ADR-0002): the token never appears in a URL or
 * page the User's browser history could retain.
 */
export const Success: FC = () => (
  <Layout title="sfu — you're all set">
    <main class="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 class="text-3xl font-extrabold text-slate-900">You're all set</h1>
      <p class="mt-4 text-lg text-slate-600">
        Your Slack token has been saved on your machine. You can close this tab and
        head back to your agent — it's ready to upload files to Slack as you.
      </p>
    </main>
  </Layout>
);
