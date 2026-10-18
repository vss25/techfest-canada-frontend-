import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/* =========================================================
   Two pages from one build:
   • index.html      → the marketing website (unchanged)
   • app/index.html  → the TTFC attendee app (PWA) at /app/
   The app has its own HTML so only /app advertises the
   manifest, Apple home-screen tags and theme colour, and the
   marketing pages never load its code.
========================================================= */

const root = fileURLToPath(new URL('.', import.meta.url))

/** Short build id for the app's "appVersion" (≤ 20 chars). */
function buildId() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '')
  }
}

/** /app, /app/schedule, /app/session/x → the app's HTML (files like /app/sw.js pass through). */
function appFallback(req, res, next) {
  const url = req.url || ''
  const path = url.split('?')[0]
  if (path === '/app') {
    res.statusCode = 301
    res.setHeader('Location', '/app/' + url.slice(4))
    res.end()
    return
  }
  if (path.startsWith('/app/') && !/\.[a-z0-9]+$/i.test(path)) {
    req.url = '/app/index.html' + (url.includes('?') ? url.slice(url.indexOf('?')) : '')
  }
  next()
}

/**
 * The app's service worker. src/app/sw/sw.js is a template: at build time the
 * list of files the app needs offline (its JS, CSS and HTML, found from the
 * app entry's chunk graph) and a version hash are written into it, and it's
 * emitted as /app/sw.js. In dev it's served with an empty precache list.
 */
function ttfcAppPwa() {
  const template = () => readFileSync(new URL('./src/app/sw/sw.js', import.meta.url), 'utf8')
  const STATIC = ['/app/manifest.webmanifest', '/app/icons/icon-192.png', '/app/icons/apple-touch-icon.png', '/app/icons/icon-96.png']
  const render = (files, version) => template()
    .replace('self.__TTFC_PRECACHE__', JSON.stringify(files))
    .replace('self.__TTFC_VERSION__', JSON.stringify(version))

  return {
    name: 'ttfc-app-pwa',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url || '').split('?')[0] === '/app/sw.js') {
          res.setHeader('Content-Type', 'text/javascript')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(render([], 'dev'))
          return
        }
        appFallback(req, res, next)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use(appFallback)
    },
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((f) => f.type === 'chunk')
      const entry = chunks.find((c) => c.isEntry && c.facadeModuleId && c.facadeModuleId.replace(/\\/g, '/').endsWith('/app/index.html'))
      if (!entry) return
      const files = new Set()
      const seen = new Set()
      // The camera scanner (badge scan) is big and rarely used: fetched on first use, not precached.
      const ONDEMAND = /react-qr-scanner|zxing-wasm|barcode-detector/
      const walk = (fileName) => {
        if (seen.has(fileName)) return
        seen.add(fileName)
        const c = bundle[fileName]
        if (!c) return
        if (c.type === 'chunk' && c.moduleIds.some((id) => ONDEMAND.test(id)) && !c.moduleIds.some((id) => id.includes('/src/app/main.jsx'))) return
        files.add('/' + fileName)
        if (c.type !== 'chunk') return
        for (const css of c.viteMetadata?.importedCss || []) files.add('/' + css)
        for (const a of c.viteMetadata?.importedAssets || []) files.add('/' + a)
        for (const i of c.imports || []) walk(i)
        for (const i of c.dynamicImports || []) walk(i)
      }
      walk(entry.fileName)
      const list = ['/app/', ...[...files].sort(), ...STATIC]
      const version = createHash('sha256').update(list.join('\n')).digest('hex').slice(0, 12)
      this.emitFile({ type: 'asset', fileName: 'app/sw.js', source: render(list, version) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ttfcAppPwa()],
  define: {
    __TTFC_APP_BUILD__: JSON.stringify(buildId()),
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app/index.html', import.meta.url)),
      },
    },
  },
})
