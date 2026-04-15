import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      host: '172.20.10.6',
      protocol: 'wss'          // wss for HTTPS
    },
    // Proxy API calls to the backend — avoids mixed content (HTTPS page → HTTP API)
    proxy: {
      '/api/': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  },

  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),                // 🔒 generates self-signed cert for HTTPS
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'TW',
        short_name: 'TW',
        description: 'Track your daily social media activities efficiently.',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})