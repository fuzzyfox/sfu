/**
 * Single source of truth for the landing page and `/llms.txt` copy.
 *
 * The same facts (issue #8 acceptance criteria) are rendered both as HTML (the
 * Home view) and as plain text (the `/llms.txt` route), so they live here once.
 * Pure — no I/O — so it is trivially unit-testable and origin-agnostic: callers
 * pass the request origin so absolute links point at whatever host served them.
 */

/** Headline / one-line explanation of what the Service does. */
export const TAGLINE =
  'Upload files to Slack as you — the file-upload tool the hosted Slack MCP is missing.';

/**
 * The command that installs the consuming Skill. `skills add <source>` resolves
 * the GitHub repo and discovers the `slack-file-upload` Skill inside it, so the
 * source is the repo (fuzzyfox/sfu), not the Skill's directory name.
 */
export const NPX_INSTALL = 'npx skills add fuzzyfox/sfu';

/**
 * The copy-paste snippet a User hands to an Agent. It points the Agent at this
 * site and its `/llms.txt`, from which the Agent can drive install + Upload.
 * `origin` is the scheme+host the page was served from (e.g. https://sfu.example).
 */
export const agentSnippet = (origin: string): string =>
  `Go to ${origin} and read ${origin}/llms.txt, then guide me through ` +
  `installing the slack-file-upload skill and uploading a file to Slack as me.`;

/** Source repository — the primary support and issue-tracking channel. */
export const GITHUB_URL = 'https://github.com/fuzzyfox/sfu';

/**
 * Support / privacy contact email. Intentionally blank so no address ships without
 * an Operator choosing one: when empty the legal pages point at GitHub Issues alone.
 * Set this to the address you want Users — and Slack Marketplace reviewers — to use.
 */
export const SUPPORT_EMAIL = '';

/** Date the legal pages (privacy, terms) were last revised, shown on each page. */
export const LEGAL_LAST_UPDATED = '5 June 2026';

/**
 * The machine-readable `/llms.txt` doc. Given only this URL, an Agent can drive
 * the whole cold-start path: authorize → install the Skill → Upload. Written in
 * the project's domain language (Service, Skill, Login, Mint, Upload, Handle-only
 * vs Direct). `origin` makes the links absolute to the serving host.
 */
export const llmsTxt = (origin: string): string => `# sfu — Slack File Upload

> ${TAGLINE}

sfu is a stateless Service that mints a per-user Slack user token (xoxp-) via
OAuth so an Agent can upload files to Slack **as the User** — landing them in the
same Conversation as the User's own messages (conversational cohesion), never as
a bot. The Service stores nothing and is never in the file's path.

## What you (the Agent) should do

1. Install the Skill that does the work:

   ${NPX_INSTALL}

   This installs the \`slack-file-upload\` Skill. Its SKILL.md is the authoritative
   guide once installed; it codifies: detect an existing valid token → if none,
   run Login → Mint → store the token → Upload.

2. If there is no valid token yet, the User performs the only two manual steps —
   installing the Slack app and Authorizing it. Send the User here to start
   authorization (the "Add to Slack" button):

   ${origin}/auth

   The Skill's \`slack-login\` utility starts a local Listener and opens this URL;
   the Service Mints the token and hands it back to the Listener over loopback.
   The token is written to the Token Store (macOS Keychain, or the
   SLACK_USER_TOKEN environment variable as a fallback).

3. Upload the file with the Skill's \`slack-upload\` utility. Two shapes, both
   needing only the \`files:write\` scope:
   - Direct upload: pass a Conversation (channel, DM, or group DM) and the file
     is posted there as the User in one step.
   - Handle-only upload: omit the Conversation to create a User-owned file and
     get back its id and Permalink, which you can then place yourself (e.g. embed
     in a canvas) via your own Slack MCP calls.

   Both return the file's { id, permalink }.

## Notes

- The Service requests only \`files:write\`. It mints and forgets — no database,
  no token in logs.
- Re-run Login to rotate the token; revoke the Slack app to kill it.

Landing page: ${origin}/
`;
