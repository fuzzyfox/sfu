/**
 * Service configuration, derived purely from an environment-like record.
 *
 * 12-factor: all config comes from the environment. Kept pure (no `process.env`
 * read inside) so it is trivially unit-testable — callers pass `process.env`.
 */
export interface Config {
  /** TCP port the HTTP server listens on. */
  port: number;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  return {
    port: env.PORT ? Number(env.PORT) : 3000,
  };
}
