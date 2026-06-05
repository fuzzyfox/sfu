/**
 * Server-side analytics seam (issue #9). A single fire-and-forget collaborator the
 * OAuth routes call to count Login flows, kept abstract so the routes never touch
 * an HTTP client and stay testable with a plain spy.
 *
 * The route hand-builds every field — in particular `url` is a clean, synthetic
 * path the Service constructs itself, never the live request URL — so the Slack
 * authorization `code`, the loopback return URL, the nonce and the minted token can
 * never reach analytics. That guarantee is structural, not best-effort.
 */
export interface AnalyticsEvent {
  /** Plausible event name, e.g. `Login Started`. */
  name: string;
  /** A clean, hand-built URL for the event — never the live request URL. */
  url: string;
  /** Resolved visitor IP, forwarded to Plausible as `X-Forwarded-For`. */
  ip?: string;
  /** Visitor User-Agent, forwarded so Plausible's bot filter accepts the event. */
  userAgent?: string;
}

/**
 * Record one analytics event. Implementations MUST be fire-and-forget: never throw
 * into, block, or delay the calling request. When analytics is unconfigured the
 * collaborator is simply absent and nothing is called.
 */
export type TrackEvent = (event: AnalyticsEvent) => void;
