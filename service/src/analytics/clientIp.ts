/**
 * Resolve the visitor's IP for server-side analytics. The Service runs behind
 * Cloudflare, so Cloudflare's `CF-Connecting-IP` is the source of truth; failing
 * that we take the first hop of `X-Forwarded-For`, and finally the direct remote
 * address. The result is forwarded to Plausible as `X-Forwarded-For` so its bot
 * filter accepts the event and counts it correctly.
 */
export interface IpSources {
  /** Cloudflare's `CF-Connecting-IP` header. */
  cfConnectingIp?: string;
  /** The `X-Forwarded-For` header (may be a `client, proxy1, …` list). */
  forwardedFor?: string;
  /** The direct connection remote address. */
  remoteAddr?: string;
}

export function resolveClientIp(sources: IpSources): string | undefined {
  const firstHop = sources.forwardedFor
    ?.split(',')
    .map((hop) => hop.trim())
    .find(Boolean);
  for (const candidate of [sources.cfConnectingIp?.trim(), firstHop, sources.remoteAddr?.trim()]) {
    if (candidate) return candidate;
  }
  return undefined;
}
