import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

// GitHub Pages can't send security headers, so the policy ships as a <meta> tag.
// No inline scripts or eval: an injected <script> or javascript: URL won't run, and
// data can only be sent to the breach-check API. frame-ancestors isn't honored in
// <meta>, so main.tsx refuses to render inside a frame instead.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // React/motion set inline styles
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://www.google.com https://*.gstatic.com", // favicons, opt-in
  "connect-src 'self' https://api.pwnedpasswords.com https://fonts.googleapis.com https://fonts.gstatic.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const securityHeaders = (): Plugin => ({
  name: 'vaultsecure-csp',
  apply: 'build', // the dev server needs inline scripts for HMR
  transformIndexHtml: html =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`
    ),
});

export default defineConfig(() => {
  // GitHub Pages serves this repo under /VaultSecure/, not the domain root, so
  // every asset URL and the PWA manifest's start_url/scope must share that base.
  // Electron loads the build via file://, which has no concept of a domain root,
  // so asset URLs there must be relative ('./') instead of absolute.
  const base = process.env.GITHUB_PAGES === 'true'
    ? '/VaultSecure/'
    : process.env.ELECTRON === 'true'
      ? './'
      : '/';

  return {
    base,
    plugins: [
      // Electron loads from file://, where 'self' is unreliable; it is sandboxed there instead
      ...(process.env.ELECTRON === 'true' ? [] : [securityHeaders()]),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'VaultSecure - Cofre de Senhas Criptografado',
          short_name: 'VaultSecure',
          description: 'Gerenciador local e seguro de senhas com criptografia AES-256-GCM, PBKDF2 e salt único por cofre.',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#0E1F24',
          theme_color: '#0E1F24',
          categories: ['utilities', 'security', 'productivity'],
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
