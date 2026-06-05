import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { makeSlackMinter } from './oauth/slack.js';
import { makePlausibleTracker } from './analytics/plausible.js';

const config = loadConfig(process.env);

// Analytics is gated entirely behind `PLAUSIBLE_DOMAIN`: unconfigured ⇒ no tracker
// and no client script, so the Service behaves exactly as before (issue #9).
const trackEvent = config.plausible
  ? makePlausibleTracker({
      domain: config.plausible.domain,
      apiHost: config.plausible.apiHost,
    })
  : undefined;

const app = createApp(
  {
    clientId: config.slackClientId,
    redirectUri: config.slackRedirectUri,
    authorizeUrl: 'https://slack.com/oauth/v2/authorize',
    userScope: 'files:write',
    mintToken: makeSlackMinter({
      clientId: config.slackClientId,
      clientSecret: config.slackClientSecret,
      redirectUri: config.slackRedirectUri,
    }),
    trackEvent,
  },
  { plausible: config.plausible },
);

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`sfu listening on :${port}`);
});
