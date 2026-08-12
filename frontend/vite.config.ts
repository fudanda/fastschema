import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

const config = defineConfig({
  base: '/dash/',
  server: {
    port: 5000,
    host: '0.0.0.0',
    proxy: {
      '/api': apiProxyTarget,
      '/files': apiProxyTarget,
    },
  },
  // TanStack Start spins up Vite preview on a random port while producing the
  // SPA shell. Binding explicitly to IPv4 keeps that step reliable on Windows.
  preview: {
    host: '127.0.0.1',
  },
  plugins: [
    tanstackStart({
      router: {
        basepath: '/dash',
      },
      spa: {
        enabled: true,
        maskPath: '/dash',
        prerender: {
          outputPath: '/dash/index',
        },
      },
      sitemap: {
        enabled: false,
      },
    }),
    viteReact(),
  ],
})

export default config
