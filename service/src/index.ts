import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { makeSlackMinter } from './oauth/slack.js';

const config = loadConfig(process.env);

const app = createApp({
  clientId: config.slackClientId,
  redirectUri: config.slackRedirectUri,
  authorizeUrl: 'https://slack.com/oauth/v2/authorize',
  userScope: 'files:write',
  mintToken: makeSlackMinter({
    clientId: config.slackClientId,
    clientSecret: config.slackClientSecret,
    redirectUri: config.slackRedirectUri,
  }),
});

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`sfu listening on :${port}`);
});
