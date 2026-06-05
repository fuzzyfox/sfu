/**
 * Service configuration, derived purely from an environment-like record.
 *
 * 12-factor: all config comes from the environment. Kept pure (no `process.env`
 * read inside) so it is trivially unit-testable — callers pass `process.env`.
 */
/**
 * Optional Plausible analytics, present only when configured. Absent (`undefined`)
 * means analytics is off and the Service behaves exactly as it does with no
 * provider: no client script is emitted and the server-side tracker is a no-op.
 */
export interface PlausibleConfig {
  /** The `data-domain` the site is registered under in Plausible. */
  domain: string;
  /** Client script URL injected on the landing page (tagged-events variant). */
  scriptSrc: string;
  /** Base URL of the Plausible Events API for server-side tracking. */
  apiHost: string;
}

export interface Config {
  /** TCP port the HTTP server listens on. */
  port: number;
  /** Slack app client id, sent on the authorize redirect. */
  slackClientId: string;
  /** Slack app client secret, used to Mint the token. Never logged. */
  slackClientSecret: string;
  /** Public HTTPS base URL of this Service, e.g. `https://sfu.wduyck.me`. */
  baseUrl: string;
  /**
   * The registered HTTPS Slack Redirect, derived as `${baseUrl}/callback`. This is
   * the only redirect URI registered with Slack, so it must match exactly.
   */
  slackRedirectUri: string;
  /**
   * Plausible analytics, gated entirely behind `PLAUSIBLE_DOMAIN`. Undefined when
   * unconfigured — the off-by-default switch (issue #9).
   */
  plausible?: PlausibleConfig;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const baseUrl = (env.BASE_URL ?? '').replace(/\/+$/, '');
  return {
    port: env.PORT ? Number(env.PORT) : 3000,
    slackClientId: env.SLACK_CLIENT_ID ?? '',
    slackClientSecret: env.SLACK_CLIENT_SECRET ?? '',
    baseUrl,
    slackRedirectUri: baseUrl ? `${baseUrl}/callback` : '',
    plausible: loadPlausible(env),
  };
}

/**
 * Derive the optional Plausible config. The presence of a non-empty
 * `PLAUSIBLE_DOMAIN` is the gate; `PLAUSIBLE_SRC` and `PLAUSIBLE_API_HOST` let an
 * Operator point at a self-hosted Plausible, otherwise the hosted defaults apply.
 */
function loadPlausible(
  env: Record<string, string | undefined>,
): PlausibleConfig | undefined {
  const domain = env.PLAUSIBLE_DOMAIN?.trim();
  if (!domain) return undefined;
  return {
    domain,
    scriptSrc: env.PLAUSIBLE_SRC ?? 'https://plausible.io/js/script.tagged-events.js',
    apiHost: env.PLAUSIBLE_API_HOST ?? 'https://plausible.io',
  };
}
