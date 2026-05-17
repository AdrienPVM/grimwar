/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png', 'fonts/*.woff2'],
      manifest: {
        name: 'GrimWar',
        short_name: 'GrimWar',
        description: 'Compagnon D&D 5e — fiche de personnage et grimwar.',
        theme_color: '#08060e',
        background_color: '#050309',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'fr',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // index.json — NetworkFirst placé AVANT le pattern SWR générique.
          // Workbox applique la première règle qui matche : ce handler doit
          // précéder /data/.*\.json$ pour ne pas être shadowé par lui.
          //
          // Pourquoi : index.json PORTE le signal de fraîcheur (contentHash).
          // S'il est servi périmé par le SW (SWR), le mécanisme
          // d'invalidation Dexie compare deux hashes périmés cohérents entre
          // eux et conclut « à jour » alors qu'un nouveau bundle est sur
          // disque. C'est Bug 1 du post-13.7 — un piège latent garanti en
          // prod PWA où le SW est enregistré (cf. plans/DEBT.md > D7).
          //
          // NetworkFirst : online → vrai disque (le bon hash) ; offline →
          // fallback cache (PWA airplane-mode reste fonctionnelle). timeout
          // 3s pour ne pas suspendre le boot si le réseau pédale.
          {
            urlPattern: /\/data\/index\.json(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'grimwar-content-index',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'grimwar-content-data',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
    // `pool: 'forks'` contourne un bug tinypool 1.x ↔ Node 22 sur Windows
    // (`TINYPOOL_WORKER_ID` undefined → crash au démarrage). Plan 13.7
    // 2026-05-17. Bénin sur les autres plateformes ; on perd un peu de
    // parallélisme mais la suite tourne en ~6 s.
    pool: 'forks',
    // Exclut les specs Playwright (tests/e2e/) du runner Vitest. Sans ça, vitest
    // tente de charger `@playwright/test` dans jsdom et crash. Les e2e tournent
    // via `pnpm test:e2e`, jamais via `pnpm test`.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
  },
});
