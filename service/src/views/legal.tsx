import type { FC, PropsWithChildren } from 'hono/jsx';
import { Layout } from './layout.js';
import { GITHUB_URL, SUPPORT_EMAIL, LEGAL_LAST_UPDATED } from '../content.js';

/**
 * The static legal + support surface: Privacy Policy, Terms of Service, and a
 * Support page. The Slack Marketplace listing requires public, hosted URLs for
 * each, so they live as Service routes (`/privacy`, `/terms`, `/support`) rather
 * than as repo Markdown.
 *
 * Every claim here is kept true to the architecture (ADR-0001 stateless Service,
 * ADR-0002 no token persistence/logging, ADR-0003 on-machine Token Store,
 * ADR-0004 analytics off-by-default). If the system changes, these change with it.
 */

/** Shared page chrome: a centred prose column with a title and "last updated" line. */
const LegalPage: FC<PropsWithChildren<{ title: string; origin?: string; updated?: boolean }>> = ({
  title,
  origin,
  updated,
  children,
}) => (
  <Layout title={`sfu — ${title}`} origin={origin}>
    <main class="mx-auto max-w-2xl px-6 py-16">
      <a href="/" class="text-sm text-slack-red hover:underline">
        ← sfu
      </a>
      <h1 class="mt-4 text-3xl font-extrabold text-slate-900">{title}</h1>
      {updated && <p class="mt-1 text-sm text-slate-400">Last updated {LEGAL_LAST_UPDATED}</p>}
      <div class="mt-8 space-y-6 text-slate-600 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-10 [&_a]:text-slack-red [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_code]:text-slack-red">
        {children}
      </div>
    </main>
  </Layout>
);

/** A consistent "how to reach us" line, GitHub-first with an optional email. */
const Contact: FC = () => (
  <p>
    Questions? Open an issue at <a href={GITHUB_URL}>{GITHUB_URL.replace('https://', '')}</a>
    {SUPPORT_EMAIL ? (
      <>
        {' '}
        or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </>
    ) : null}
    .
  </p>
);

export const Privacy: FC<{ origin?: string }> = ({ origin }) => (
  <LegalPage title="Privacy Policy" origin={origin} updated>
    <p>
      <strong>sfu</strong> is a stateless service that runs Slack's OAuth flow to mint a personal
      Slack user token and hand it back to your own machine. An accompanying agent skill then uploads
      files <em>directly from your machine to Slack</em>. The service is never in the path of your
      files. This policy explains exactly what the service does and does not handle.
    </p>

    <h2>What we do not collect or store</h2>
    <ul>
      <li>
        <strong>Your Slack token.</strong> The minted token (<code>xoxp-</code>) is never written to
        any database and never logged. It passes through the service in memory only long enough to
        complete the hand-back to your machine, then it is discarded.
      </li>
      <li>
        <strong>Your files.</strong> Uploads go straight from your machine to Slack. No file content
        ever reaches the service.
      </li>
      <li>
        <strong>Your Slack messages, channels, or workspace data.</strong> The service requests only
        the <code>files:write</code> scope and reads none of your content.
      </li>
      <li>
        <strong>Accounts.</strong> There is no sign-up and no user database. The service holds no
        state of its own.
      </li>
    </ul>

    <h2>Where your token lives</h2>
    <p>
      Once minted, the token is stored <strong>only on your machine</strong> — in the macOS Keychain,
      or in the <code>SLACK_USER_TOKEN</code> environment variable on other platforms. You control it
      and can revoke it at any time from your Slack workspace's app settings, which immediately
      invalidates it.
    </p>

    <h2>Analytics</h2>
    <p>
      An instance of the service <em>may</em> use{' '}
      <a href="https://plausible.io/privacy-focused-web-analytics">Plausible</a>, a privacy-friendly,
      cookieless analytics tool, to count visits and anonymous flow milestones (for example, that a
      login started or completed). Analytics is <strong>off unless the operator explicitly enables
      it</strong>. When enabled:
    </p>
    <ul>
      <li>No cookies are set and no cross-site tracking is performed.</li>
      <li>
        Standard request metadata — your IP address and User-Agent — is sent to Plausible solely to
        derive aggregate, anonymous counts. It is not used to identify you and is not retained as
        personal data.
      </li>
      <li>
        No token, no file content, and no Slack data is ever sent to analytics. The OAuth pages that
        carry secrets never load the analytics script at all.
      </li>
    </ul>

    <h2>Third parties</h2>
    <ul>
      <li>
        <strong>Slack</strong> — the OAuth provider you authorize. See Slack's own privacy policy.
      </li>
      <li>
        <strong>Plausible</strong> — analytics, only if the operator has enabled it (see above).
      </li>
      <li>
        <strong>The hosting provider</strong> — operates the server and may keep transient
        operational logs (request metadata) as is standard for any website; these never contain
        tokens.
      </li>
    </ul>

    <h2>Changes</h2>
    <p>
      We may update this policy as the service evolves. Material changes will be reflected here with a
      new "last updated" date.
    </p>

    <Contact />
  </LegalPage>
);

export const Terms: FC<{ origin?: string }> = ({ origin }) => (
  <LegalPage title="Terms of Service" origin={origin} updated>
    <p>
      By using <strong>sfu</strong> (the hosted service and the <code>slack-file-upload</code> skill,
      together the "Service") you agree to these terms. The Service is provided free of charge.
    </p>

    <h2>What the Service does</h2>
    <p>
      The Service runs Slack's OAuth flow to mint a personal Slack user token onto your machine and
      provides a skill that uses that token to upload files to Slack as you. It requests only the{' '}
      <code>files:write</code> scope.
    </p>

    <h2>Acceptable use</h2>
    <ul>
      <li>Use the Service only with Slack accounts and workspaces you are authorized to use.</li>
      <li>
        Comply with{' '}
        <a href="https://slack.com/terms-of-service">Slack's terms</a> and your workspace's policies.
      </li>
      <li>Do not use the Service to upload unlawful, infringing, or abusive content.</li>
      <li>Do not attempt to disrupt, overload, or reverse the Service for malicious ends.</li>
    </ul>

    <h2>Your token, your responsibility</h2>
    <p>
      The minted token grants access to your Slack account and is stored on your machine. You are
      responsible for safeguarding it. If it may be compromised, revoke it from your Slack workspace's
      app settings. The Service never stores your token and cannot recover or revoke it for you.
    </p>

    <h2>No warranty</h2>
    <p>
      The Service is provided "as is" and "as available", without warranties of any kind, express or
      implied. We do not guarantee that it will be uninterrupted, error-free, or available at any
      particular time, and we may change or discontinue any part of it.
    </p>

    <h2>Limitation of liability</h2>
    <p>
      To the fullest extent permitted by law, the maintainers shall not be liable for any indirect,
      incidental, or consequential damages, or for any loss arising from your use of, or inability to
      use, the Service.
    </p>

    <h2>Changes</h2>
    <p>
      We may revise these terms; continued use after a change constitutes acceptance of the revised
      terms.
    </p>

    <Contact />
  </LegalPage>
);

export const Support: FC<{ origin?: string }> = ({ origin }) => (
  <LegalPage title="Support" origin={origin}>
    <p>
      Need help with <strong>sfu</strong>? Here's how to reach us and where to look first.
    </p>

    <h2>Get in touch</h2>
    <p>
      The primary support channel is GitHub Issues — search for an existing report, or open a new one:
    </p>
    <ul>
      <li>
        <a href={`${GITHUB_URL}/issues`}>{GITHUB_URL.replace('https://', '')}/issues</a>
      </li>
      {SUPPORT_EMAIL ? (
        <li>
          Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </li>
      ) : null}
    </ul>
    <p>
      Issues are handled on a best-effort basis. Please include your OS, what you ran, and what you
      expected versus what happened — never paste your Slack token.
    </p>

    <h2>Before you file</h2>
    <ul>
      <li>
        <strong>Read the docs.</strong> The{' '}
        <a href={GITHUB_URL}>README</a> covers install and usage, and <a href="/llms.txt">/llms.txt</a>{' '}
        describes the whole flow for agents.
      </li>
      <li>
        <strong>Re-authorize.</strong> If uploads fail with an auth error, your token may have been
        revoked or expired — run the login flow again to mint a fresh one.
      </li>
      <li>
        <strong>Check your token store.</strong> The token lives in your macOS Keychain, or in the{' '}
        <code>SLACK_USER_TOKEN</code> environment variable on other platforms.
      </li>
      <li>
        <strong>Revoke any time.</strong> You can revoke access from your Slack workspace's app
        settings; this immediately invalidates the token.
      </li>
    </ul>
  </LegalPage>
);
