/**
 * Service configuration, derived purely from an environment-like record.
 *
 * 12-factor: all config comes from the environment. Kept pure (no `process.env`
 * read inside) so it is trivially unit-testable — callers pass `process.env`.
 */
export interface Config {
  /** TCP port the HTTP server listens on. */
  port: number;
  /** Slack app client id, sent on the authorize redirect. */
  slackClientId: string;
  /** Slack app client secret, used to Mint the token. Never logged. */
  slackClientSecret: string;
  /** The registered HTTPS Slack Redirect, e.g. `https://sfu.wduyck.me/callback`. */
  slackRedirectUri: string;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  return {
    port: env.PORT ? Number(env.PORT) : 3000,
    slackClientId: env.SLACK_CLIENT_ID ?? '',
    slackClientSecret: env.SLACK_CLIENT_SECRET ?? '',
    slackRedirectUri: env.SLACK_REDIRECT_URI ?? '',
  };
}
