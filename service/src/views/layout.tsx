import type { FC, PropsWithChildren } from 'hono/jsx';
import type { PlausibleConfig } from '../config.js';
import { TAGLINE } from '../content.js';

/**
 * Shared HTML shell for the Service's pages: loads the compiled Tailwind stylesheet,
 * Alpine.js for small client interactions (copy buttons), and the Poppins webfont
 * that the `hush` visual language is built on.
 *
 * When `plausible` is supplied, the privacy-friendly Plausible client script is
 * injected (issue #9). It is opt-in per page — only the landing page passes it — so
 * the script never loads on pages that carry secrets in the URL. When omitted the
 * shell is byte-identical to the unconfigured Service.
 *
 * When `origin` (the scheme+host the request arrived on) is supplied, Open Graph /
 * Twitter card tags are emitted so links unfurl with the 1200×630 `og.png` card in
 * Slack, X, LinkedIn, Discord, etc. The card needs an absolute image URL, so it is
 * only emitted when the caller knows the origin; pages that omit it simply carry no
 * social card. `description` defaults to the shared TAGLINE.
 */
export const Layout: FC<
  PropsWithChildren<{
    title?: string;
    description?: string;
    origin?: string;
    plausible?: PlausibleConfig;
  }>
> = ({ title = 'sfu — Slack File Upload', description = TAGLINE, origin, plausible, children }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <meta name="description" content={description} />
      {origin && (
        <>
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="sfu" />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={`${origin}/`} />
          <meta property="og:image" content={`${origin}/public/og.png`} />
          <meta property="og:image:type" content="image/png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content="Upload files to Slack as you." />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={description} />
          <meta name="twitter:image" content={`${origin}/public/og.png`} />
        </>
      )}
      <link rel="icon" href="/public/favicon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/public/icon.png" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/public/style.css" />
      <script defer src="/public/alpine.js"></script>
      {plausible && (
        <script defer data-domain={plausible.domain} src={plausible.scriptSrc}></script>
      )}
    </head>
    <body class="bg-white text-slate-800 font-sans">{children}</body>
  </html>
);
