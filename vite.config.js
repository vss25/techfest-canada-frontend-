import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DESK_NAME, DESK_PATH } from './src/checkin/deskPath.js'

/* =========================================================
   Three pages from one build:
   • index.html      → the marketing website (unchanged)
   • app/index.html  → the TTFC attendee app (PWA) at /app/
   • desk/index.html → TTFC Check-in, the guest check-in desk app, served
                       ONLY at its unlisted path (src/checkin/deskPath.js
                       DESK_PATH, /checkin-<token>/): ttfcDeskPwa below
                       moves the page there, writes its manifest, icons and
                       service worker next to it; /desk/ itself is never
                       published
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
  const STATIC = ['/app/manifest.webmanifest', '/app/brand/logo.webp', '/app/brand/share-mark.png', '/app/icons/icon-192.png', '/app/icons/apple-touch-icon.png', '/app/icons/icon-96.png']
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

/**
 * TTFC Check-in: its own installable app at DESK_PATH (own name, icons, scope and service worker, so it installs on
 * its own next to the attendee app). The page is built from desk/index.html and published at DESK_PATH/index.html
 * (the token is only in src/checkin/deskPath.js and vercel.json). Next to it: manifest.webmanifest, icons/*.png (from
 * src/checkin/icons) and sw.js (src/checkin/sw.js with the files the app needs offline, from the desk entry's
 * chunk graph). Dev / preview: the same paths are served by the middleware below.
 */
function ttfcDeskPwa() {
  const base = DESK_PATH
  const dir = base.slice(1)
  const ICONS = ['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png', 'icon-96.png', 'favicon-64.png']
  const icon = (name) => readFileSync(new URL(`./src/checkin/icons/${name}`, import.meta.url))
  const manifest = () => JSON.stringify({
    id: base,
    name: DESK_NAME,
    short_name: 'Check-in',
    description: 'TTFC 2026 guest check-in for staff and volunteers.',
    start_url: `${base}?source=pwa`,
    scope: base,
    display: 'standalone',
    display_override: ['standalone'],
    orientation: 'any',
    background_color: '#0B0823',
    theme_color: '#0B0823',
    lang: 'en-CA',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2)
  const STATIC = ['manifest.webmanifest', ...ICONS.map((n) => `icons/${n}`)].map((f) => base + f)
  const render = (files, version) => readFileSync(new URL('./src/checkin/sw.js', import.meta.url), 'utf8')
    .replace('self.__DESK_PRECACHE__', JSON.stringify(files))
    .replace('self.__DESK_VERSION__', JSON.stringify(version))
    .replace('self.__DESK_SCOPE__', JSON.stringify(base))
  const send = (res, type, body, cache = 'no-cache') => {
    res.setHeader('Content-Type', type)
    res.setHeader('Cache-Control', cache)
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
    res.end(body)
  }
  /** The desk's own paths, in dev (`page` = the source HTML) and preview (`page` = the built one). */
  const middleware = (page, dev) => (req, res, next) => {
    const url = req.url || ''
    const path = url.split('?')[0]
    const query = url.includes('?') ? url.slice(url.indexOf('?')) : ''
    if (path === base.slice(0, -1)) { res.statusCode = 301; res.setHeader('Location', base + query); res.end(); return }
    if (/^\/desk(\/|$)/.test(path)) { res.statusCode = 404; res.end('Not found'); return }
    if (!path.startsWith(base)) return next()
    const rest = path.slice(base.length)
    if (rest === 'manifest.webmanifest') return send(res, 'application/manifest+json', manifest())
    if (rest.startsWith('icons/') && ICONS.includes(rest.slice(6))) return send(res, 'image/png', icon(rest.slice(6)), 'public, max-age=3600')
    if (rest === 'sw.js' && dev) return send(res, 'text/javascript', render([], 'dev'))
    if (!/\.[a-z0-9]+$/i.test(rest)) { req.url = page + query; res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive') }
    next()
  }
  return {
    name: 'ttfc-desk-pwa',
    enforce: 'post',
    configureServer(server) { server.middlewares.use(middleware('/desk/index.html', true)) },
    configurePreviewServer(server) { server.middlewares.use(middleware(`${base}index.html`, false)) },
    generateBundle(_options, bundle) {
      const html = bundle['desk/index.html']
      if (!html) return
      delete bundle['desk/index.html']
      this.emitFile({ type: 'asset', fileName: `${dir}index.html`, source: html.source })
      this.emitFile({ type: 'asset', fileName: `${dir}manifest.webmanifest`, source: manifest() })
      for (const n of ICONS) this.emitFile({ type: 'asset', fileName: `${dir}icons/${n}`, source: icon(n) })
      const chunks = Object.values(bundle).filter((f) => f.type === 'chunk')
      const entry = chunks.find((c) => c.isEntry && c.facadeModuleId && c.facadeModuleId.replace(/\\/g, '/').endsWith('/desk/index.html'))
      const files = new Set()
      const seen = new Set()
      const walk = (fileName) => {
        if (seen.has(fileName)) return
        seen.add(fileName)
        const c = bundle[fileName]
        if (!c) return
        files.add('/' + fileName)
        if (c.type !== 'chunk') return
        for (const css of c.viteMetadata?.importedCss || []) files.add('/' + css)
        for (const a of c.viteMetadata?.importedAssets || []) files.add('/' + a)
        for (const i of c.imports || []) walk(i)
        for (const i of c.dynamicImports || []) walk(i)
      }
      if (entry) walk(entry.fileName)
      const list = [base, ...[...files].sort(), ...STATIC]
      const version = createHash('sha256').update(list.join('\n')).digest('hex').slice(0, 12)
      this.emitFile({ type: 'asset', fileName: `${dir}sw.js`, source: render(list, version) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ttfcAppPwa(), ttfcDeskPwa()],
  define: {
    __TTFC_APP_BUILD__: JSON.stringify(buildId()),
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app/index.html', import.meta.url)),
        desk: fileURLToPath(new URL('./desk/index.html', import.meta.url)),
      },
    },
  },
})
