import type { FC } from 'hono/jsx';
import { Layout } from './layout.js';
import { TAGLINE, NPX_INSTALL, agentSnippet } from '../content.js';

/**
 * Alpine state shared across the page: a single `copy(value, key)` helper that
 * writes to the clipboard and flips a per-button `copied` flag for 1.5s so the
 * label can confirm. Mirrors the fuzzyfox/wmgid copy-button pattern.
 */
const copyHelper = `{
  copied: null,
  async copy(value, key) {
    try {
      await navigator.clipboard.writeText(value);
      this.copied = key;
      setTimeout(() => { if (this.copied === key) this.copied = null; }, 1500);
    } catch (e) { console.error(e); }
  }
}`;

/** The official multicolour Slack mark. */
const SlackMark: FC<{ class?: string }> = ({ class: cls }) => (
  <svg viewBox="0 0 122.8 122.8" class={cls} aria-hidden="true">
    <path
      d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
      fill="#e01e5a"
    />
    <path
      d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
      fill="#36c5f0"
    />
    <path
      d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
      fill="#2eb67d"
    />
    <path
      d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
      fill="#ecb22e"
    />
  </svg>
);

/**
 * The sfu landing page — Slack-themed `hush` visual language (friendly Poppins,
 * Slack's aubergine + accent palette). Explains what the Service is and carries
 * every issue-#8 acceptance affordance: an Add to Slack button that starts
 * authorization, the `npx skills` install command, a copy-paste Agent snippet,
 * and a link to `/llms.txt`.
 *
 * `origin` is the scheme+host the request arrived on, so absolute links in the
 * Agent snippet point at whatever host served the page.
 */
export const Home: FC<{ origin: string }> = ({ origin }) => {
  const snippet = agentSnippet(origin);

  return (
    <Layout>
      <div x-data={copyHelper}>
        <header class="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div class="font-extrabold text-xl">sfu</div>
          <a href="/llms.txt" class="text-sm text-slate-400 hover:text-slack-red">
            /llms.txt for agents
          </a>
        </header>

        {/* hero */}
        <section class="max-w-5xl mx-auto px-6 pt-10 pb-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 class="text-4xl md:text-5xl font-extrabold leading-[1.1] mb-4">
              Upload files to Slack <span class="text-slack-red">as you.</span>
            </h1>
            <p class="text-lg text-slate-500 mb-6">{TAGLINE}</p>

            <div class="bg-slate-900 text-slate-100 rounded-xl px-4 py-3 font-mono text-sm mb-6 flex items-center gap-3">
              <span class="min-w-0 flex items-baseline gap-2">
                <span class="text-slack-green select-none">$</span>
                <span class="break-all">
                  {NPX_INSTALL}
                  <span class="blink text-slack-green ml-0.5">▋</span>
                </span>
              </span>
              <button
                {...{ '@click': `copy(${JSON.stringify(NPX_INSTALL)}, 'npx')` }}
                class="ml-auto shrink-0 text-xs text-slate-400 hover:text-white"
              >
                <span x-text="copied === 'npx' ? '✓ copied' : 'copy'">copy</span>
              </button>
            </div>

            <a
              href="/auth"
              class="inline-flex items-center gap-2.5 bg-aubergine hover:bg-aubergine-light text-white font-semibold px-6 py-3 rounded-lg shadow-lg shadow-aubergine/30 transition"
            >
              <SlackMark class="w-5 h-5" /> Add to Slack
            </a>
          </div>

          {/* slack mockup: the file, posted as you */}
          <div class="bg-white rounded-2xl shadow-xl ring-1 ring-slate-100 p-4">
            <div class="text-xs text-slate-400 font-semibold mb-2">＃ project-updates</div>
            <div class="flex gap-3 py-1.5">
              <div class="shrink-0 w-9 h-9 rounded-md grid place-items-center text-white text-xs font-bold bg-aubergine">
                WD
              </div>
              <div class="min-w-0">
                <div class="text-sm">
                  <span class="font-extrabold text-slate-900">William</span>{' '}
                  <span class="text-slate-400 text-xs">10:24 AM</span>
                </div>
                <div class="text-sm text-slate-700">Here's this week's audio standup 👇</div>
                <div class="mt-1.5 flex items-center gap-3 border border-slate-200 rounded-lg p-2.5 max-w-xs">
                  <div class="shrink-0 w-9 h-9 rounded bg-violet-100 text-violet-600 grid place-items-center">
                    🎵
                  </div>
                  <div class="leading-tight">
                    <div class="text-sm font-semibold text-slate-800">standup-update.mp3</div>
                    <div class="text-xs text-slate-400">Audio · 2.3 MB</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="text-[11px] text-slate-400 mt-2 pl-12">
              ↑ uploaded by your agent, posted as <b class="text-slack-red">you</b> — not a bot.
            </div>
          </div>
        </section>

        {/* feature band */}
        <section class="bg-aubergine text-white py-16">
          <div class="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-10 text-center">
            <div>
              <div class="text-3xl mb-3">🙋</div>
              <h3 class="font-bold mb-1">As you</h3>
              <p class="text-sm text-white/70">
                Files land in the same Conversation as your own messages, attributed to you —
                never an out-of-place bot.
              </p>
            </div>
            <div>
              <div class="text-3xl mb-3">🪶</div>
              <h3 class="font-bold mb-1">Stateless</h3>
              <p class="text-sm text-white/70">
                The Service mints your token and forgets it. No database, no logs, never in the
                file's path.
              </p>
            </div>
            <div>
              <div class="text-3xl mb-3">🔐</div>
              <h3 class="font-bold mb-1">
                <code>files:write</code> only
              </h3>
              <p class="text-sm text-white/70">
                Minimal scope. The token lives in your Keychain and stays on your machine.
              </p>
            </div>
          </div>
        </section>

        {/* agent snippet */}
        <section class="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 class="text-2xl font-extrabold mb-2">Already have an agent? Hand it the rest.</h2>
          <p class="text-slate-500 mb-6">
            Paste this and it'll read{' '}
            <a href="/llms.txt" class="text-slack-red hover:text-aubergine underline">
              /llms.txt
            </a>
            , install the skill, and complete the Upload for you.
          </p>
          <div class="bg-slate-50 ring-1 ring-slate-200 rounded-xl p-4 text-left">
            <pre class="text-sm whitespace-pre-wrap text-slate-600 leading-relaxed">{snippet}</pre>
            <button
              {...{ '@click': `copy(${JSON.stringify(snippet)}, 'snippet')` }}
              class="mt-3 text-sm font-semibold text-slack-red hover:text-aubergine"
            >
              <span x-text="copied === 'snippet' ? '✓ copied' : 'copy snippet'">copy snippet</span>
            </button>
          </div>
        </section>

        <footer class="text-center text-sm text-slate-400 py-10 border-t border-slate-100">
          Stateless · stores nothing · requests only <code>files:write</code>
        </footer>
      </div>
    </Layout>
  );
};
