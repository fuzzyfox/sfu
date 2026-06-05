import type { FC } from 'hono/jsx';
import { Layout } from './layout.js';
import { NPX_INSTALL } from '../content.js';

/**
 * Shown when a human hits `/auth` directly — e.g. clicking "Add to Slack" on the
 * landing page. There is no loopback Listener in that path, so the Service cannot
 * Hand a token back; authorizing from here would Mint a token with nowhere to go.
 *
 * Instead we explain the real entry point: install the Skill and run `slack-login`,
 * which spins up the Listener and re-opens `/auth` with a Return URL. This mirrors
 * step 2 of `/llms.txt`.
 */
export const AuthStart: FC = () => (
  <Layout title="sfu — start authorization">
    <main class="mx-auto max-w-xl px-6 py-20">
      <h1 class="text-3xl font-extrabold text-slate-900">One step from your terminal</h1>
      <p class="mt-4 text-lg text-slate-600">
        Authorizing sfu hands a Slack token back to your own machine, so it's started
        by the <code class="text-slack-red">slack-login</code> utility — not from this
        page directly. Install the Skill, then run it:
      </p>

      <div class="mt-6 space-y-3 font-mono text-sm">
        <div class="bg-slate-900 text-slate-100 rounded-xl px-4 py-3">
          <span class="text-slack-green select-none">$ </span>
          {NPX_INSTALL}
        </div>
        <div class="bg-slate-900 text-slate-100 rounded-xl px-4 py-3">
          <span class="text-slack-green select-none">$ </span>slack-login
        </div>
      </div>

      <p class="mt-6 text-slate-600">
        <code class="text-slack-red">slack-login</code> opens this same authorization
        flow with a one-time local listener, captures your token, and saves it to your
        Keychain. Your agent can then upload files to Slack as you.
      </p>
      <p class="mt-4">
        <a href="/" class="text-slack-red hover:underline">← Back to sfu</a>
      </p>
    </main>
  </Layout>
);
