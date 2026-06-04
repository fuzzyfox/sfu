# Stateless token-minting service, out of the file path

The Service exists to fill one gap — the hosted Slack MCP has no file-upload tool —
and does so by Minting per-user `xoxp-` tokens via OAuth and nothing else. It stays
**out of the file-transfer path**: the Skill performs Uploads locally with the
User's token; the Service never sees file bytes, holds no database, and stores no
tokens. The only reason it must be hosted at all is that Slack OAuth rejects plain
`http://localhost` redirect URIs.

## Considered options

- **Token-only (chosen):** Service mints, Skill uploads. Maximally stateless and
  private; a Service outage doesn't break in-flight uploads.
- **Upload proxy:** Skill sends bytes + token to the Service, which uploads. Rejected
  — it puts a permanent service on the hot path that handles every User's bytes and
  token, for no benefit over a one-call local SDK upload.

## Consequences

Uploads are attributed to the **individual User via their `xoxp-` token, never a bot**
— this is non-negotiable because Conversational cohesion requires the file to appear
as the User in the same Conversation as their own messages, which a bot uploading
elsewhere cannot achieve. External file hosting (S3, etc.) is rejected for the same
reason. The Skill therefore carries the upload logic and the `python-slack-sdk`
dependency; the Service stays tiny.
