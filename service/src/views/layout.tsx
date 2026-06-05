import type { FC, PropsWithChildren } from 'hono/jsx';

/**
 * Shared HTML shell for the Service's pages: loads the compiled Tailwind stylesheet,
 * Alpine.js for small client interactions (copy buttons), and the Poppins webfont
 * that the `hush` visual language is built on.
 */
export const Layout: FC<PropsWithChildren<{ title?: string }>> = ({
  title = 'sfu — Slack File Upload',
  children,
}) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/public/style.css" />
      <script defer src="/public/alpine.js"></script>
    </head>
    <body class="bg-white text-slate-800 font-sans">{children}</body>
  </html>
);
