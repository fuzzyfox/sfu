/**
 * Return-URL validator — the single most important piece of code in the Service.
 *
 * The Service Hands the minted token back to whatever `return` the CLI supplied.
 * If that target could be any URL, `/auth?return=https://evil` would turn the
 * Service into a token-exfiltration redirector (ADR-0002). So the Return URL is
 * locked to loopback `http://localhost` / `http://127.0.0.1` only — every other
 * host, scheme, and embedded-credential trick is rejected. Pure, no I/O.
 */

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

export function isValidReturnUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:') return false;
  // Reject embedded credentials (`http://localhost@evil`, `http://user:pass@…`).
  if (url.username !== '' || url.password !== '') return false;
  return LOOPBACK_HOSTS.has(url.hostname);
}
