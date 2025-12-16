import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['smriti-logo.svg'],
      manifest: {
        name: 'Smriti - Personal Journal & Productivity',
        short_name: 'Smriti',
        description: 'Your personal journal, task manager, and calendar app designed for focus and reflection',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/smriti-logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/smriti-logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        categories: ['productivity', 'lifestyle', 'health'],
        shortcuts: [
          {
            name: 'New Journal',
            short_name: 'Journal',
            description: 'Write a new journal entry',
            url: '/journals/new',
            icons: [{ src: '/smriti-logo.svg', sizes: '96x96' }]
          },
          {
            name: 'Tasks',
            short_name: 'Tasks',
            description: 'View your tasks',
            url: '/tasks',
            icons: [{ src: '/smriti-logo.svg', sizes: '96x96' }]
          },
          {
            name: 'Calendar',
            short_name: 'Calendar',
            description: 'View your calendar',
            url: '/calendar',
            icons: [{ src: '/smriti-logo.svg', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tailwind-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/messaging'],
        }
      }
    }
  }
});