/**
 * OAuth `state` codec — the seam that lets the Service stay stateless.
 *
 * `slack-login` opens `/auth?return=…&state=NONCE`; the Service packs the pending
 * Login `{returnUrl, nonce}` into the OAuth `state` it sends to Slack, which
 * round-trips it verbatim to the Slack Redirect. Decoding `state` on the way back
 * is how the Service remembers where to Hand back — with no server-side storage
 * (ADR-0002). Pure, no I/O.
 *
 * `state` is base64url-encoded JSON. It is NOT a security control: the exfiltration
 * defence is the Return-URL validator, which re-checks the decoded `returnUrl` at
 * `/callback`. The codec only guarantees that a well-formed `state` round-trips and
 * that malformed/tampered input is rejected cleanly rather than silently mis-parsed.
 */

/** A pending Login the Service must route a token back to. */
export interface PendingLogin {
  /** The loopback Return URL the CLI's Listener is waiting on. */
  returnUrl: string;
  /** The nonce the Listener checks before accepting the Handback. */
  nonce: string;
}

/** Thrown when `state` is malformed or tampered and cannot be trusted. */
export class InvalidState extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidState';
  }
}

export function encodeState(login: PendingLogin): string {
  const json = JSON.stringify({ returnUrl: login.returnUrl, nonce: login.nonce });
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeState(state: string): PendingLogin {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidState('state is not valid base64url-encoded JSON');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as PendingLogin).returnUrl !== 'string' ||
    typeof (parsed as PendingLogin).nonce !== 'string'
  ) {
    throw new InvalidState('state is missing returnUrl or nonce');
  }

  const { returnUrl, nonce } = parsed as PendingLogin;
  return { returnUrl, nonce };
}
