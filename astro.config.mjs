import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

// Existing process environment (including CI/test values) takes precedence.
if (existsSync('.env')) loadEnvFile('.env');

export default defineConfig({
  ...(process.env.SITE_URL ? { site: process.env.SITE_URL } : {}),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  devToolbar: { enabled: false },
});
