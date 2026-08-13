import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

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
  ssr: {
    // Semi's ESM build uses extensionless internal imports. Bundling it for the
    // server keeps TanStack Start prerendering on Node ESM-compatible output.
    noExternal: [/^@douyinfe\/semi-/, /^date-fns(?:-tz)?/],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@douyinfe')) return 'semi-vendor'
          if (id.includes('@tanstack')) return 'tanstack-vendor'
          if (id.includes('react')) return 'react-vendor'
          if (id.includes('lucide-react')) return 'icons-vendor'
          return undefined
        },
      },
    },
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
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      outputStructure: 'message-modules',
      emitTsDeclarations: true,
      cookieName: 'FASTSCHEMA_LOCALE',
      strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
    }),
  ],
})

export default config
