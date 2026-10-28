import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { devvit } from '@devvit/start/vite';

export default defineConfig({
  plugins: [react(), tailwind(), devvit()],
  resolve: {
    alias: {
      // The package's server entry also exports an Express router, which
      // needs Express. The Hono server only uses the telemetry client, so
      // build from that file directly (same code, no Express).
      '@devvit/analytics/server/reddit': fileURLToPath(
        new URL(
          './node_modules/@devvit/analytics/server/reddit/telemetry.js',
          import.meta.url
        )
      ),
    },
  },
});
