import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/*
 * Open Graph tags must carry ABSOLUTE urls — WhatsApp, iMessage, Facebook and
 * LinkedIn all ignore relative ones and render the link with no image. But the
 * right absolute url differs per environment, and hardcoding one means every
 * deploy to a new host silently ships broken previews.
 *
 * So index.html writes __SITE_URL__ and this resolves it at build time:
 *
 *   1. SITE_URL                          — set it yourself to override anything
 *   2. VERCEL_PROJECT_PRODUCTION_URL     — Vercel injects this automatically,
 *                                          e.g. nandans-photography.vercel.app
 *   3. the real domain                   — the eventual home, used as fallback
 *
 * Once the custom domain is live on Vercel, (2) becomes that domain and this
 * keeps working with no edit.
 */
const FALLBACK_SITE_URL = 'https://nandansphotography.com';

function resolveSiteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;

  return FALLBACK_SITE_URL;
}

function siteUrlPlugin(): Plugin {
  const siteUrl = resolveSiteUrl();
  return {
    name: 'inject-site-url',
    transformIndexHtml(html) {
      return html.replaceAll('__SITE_URL__', siteUrl);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), siteUrlPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
