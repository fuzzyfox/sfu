import type { FC, PropsWithChildren } from 'hono/jsx';
import type { PlausibleConfig } from '../config.js';

/**
 * Shared HTML shell for the Service's pages: loads the compiled Tailwind stylesheet,
 * Alpine.js for small client interactions (copy buttons), and the Poppins webfont
 * that the `hush` visual language is built on.
 *
 * When `plausible` is supplied, the privacy-friendly Plausible client script is
 * injected (issue #9). It is opt-in per page — only the landing page passes it — so
 * the script never loads on pages that carry secrets in the URL. When omitted the
 * shell is byte-identical to the unconfigured Service.
 */
export const Layout: FC<PropsWithChildren<{ title?: string; plausible?: PlausibleConfig }>> = ({
  title = 'sfu — Slack File Upload',
  plausible,
  children,
}) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
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
