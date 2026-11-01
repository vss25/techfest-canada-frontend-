import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DESK_NAME, DESK_PATH, RETIRED_DESK_PATHS } from './src/checkin/deskPath.js'
import { deskSwVersion } from './src/checkin/swVersion.js'
import { prerenderSite } from './src/seo/prerender.mjs'

/* =========================================================
   Three pages from one build:
   • index.html      → the marketing website (unchanged)
   • app/index.html  → the TTFC attendee app (PWA) at /app/
   • desk/index.html → TTFC Check-in, the guest check-in desk app, served
                       ONLY at its (unlisted) path /checkin/
                       (src/checkin/deskPath.js DESK_PATH): ttfcDeskPwa
                       below moves the page there, writes its manifest,
                       icons and service worker next to it, and a small
                       worker at each earlier address (RETIRED_DESK_PATHS)
                       that sends devices there; /desk/ itself is never
                       published
   The app has its own HTML so only /app advertises the
   manifest, Apple home-screen tags and theme colour, and the
   marketing pages never load its code.
   After the build, ttfcPrerender gives each public page of the
   website its own copy of index.html (Oct 31 2026, below).
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
 * TTFC Check-in: its own installable app at DESK_PATH, /checkin/ (own name, icons, scope and service worker, so it
 * installs on its own next to the attendee app). The page is built from desk/index.html and published at
 * DESK_PATH/index.html. Next to it: manifest.webmanifest, icons/*.png (from src/checkin/icons) and sw.js
 * (src/checkin/sw.js with the files the app needs offline, from the desk entry's chunk graph). At each earlier
 * address (RETIRED_DESK_PATHS, e.g. /checkin-<token>/): only sw.js, src/checkin/retiredSw.js, which replaces the
 * worker a device installed there and sends that address to DESK_PATH (vercel.json redirects the rest). Dev /
 * preview: the same paths (and vercel.json's redirects to DESK_PATH) are served by the middleware below.
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
  const template = () => readFileSync(new URL('./src/checkin/sw.js', import.meta.url), 'utf8')
  const render = (files, version) => template()
    .replace('self.__DESK_PRECACHE__', JSON.stringify(files))
    .replace('self.__DESK_VERSION__', JSON.stringify(version))
    .replace('self.__DESK_SCOPE__', JSON.stringify(base))
  const retiredTemplate = () => readFileSync(new URL('./src/checkin/retiredSw.js', import.meta.url), 'utf8')
  const retired = () => retiredTemplate().replace('self.__DESK_TARGET__', JSON.stringify(base))
  // vercel.json's redirects to DESK_PATH: /checkin, /check-in, any capitalisation, with or without the slash (not
  // /checkin/ itself), and everything under an earlier address but its sw.js.
  const typed = (path) => /^\/check-?in\/?$/i.test(path) && path !== base
  // …and a station's address typed the same way (/CheckIn/Lobby, /check-in/floor-1 → /checkin/<the rest>).
  const typedStation = (path) => (/^\/check-?in\/./i.test(path) && !path.startsWith(base) ? base + path.replace(/^\/check-?in\//i, '') : '')
  const retiredOf = (path) => RETIRED_DESK_PATHS.find((p) => path === p.slice(0, -1) || path.startsWith(p))
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
    const old = retiredOf(path)
    if (old && path === `${old}sw.js`) return send(res, 'text/javascript', retired())
    if (typed(path) || old) { res.statusCode = 308; res.setHeader('Location', base + query); res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive'); res.end(); return }
    if (typedStation(path)) { res.statusCode = 308; res.setHeader('Location', typedStation(path) + query); res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive'); res.end(); return }
    // /get-app (the lobby's app QR code, src/lib/getApp.js), as vercel.json rewrites it.
    if (path === '/get-app' || path === '/get-app/') { req.url = '/get-app/index.html' + query; return next() }
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
      // A new version whenever anything a device gets from the worker changes: the files, the page, the worker itself,
      // the manifest, the icons (src/checkin/swVersion.js).
      const version = deskSwVersion({ files: list, page: html.source, template: template(), manifest: manifest(), icons: ICONS.map(icon) })
      this.emitFile({ type: 'asset', fileName: `${dir}sw.js`, source: render(list, version) })
      for (const old of RETIRED_DESK_PATHS) this.emitFile({ type: 'asset', fileName: `${old.slice(1)}sw.js`, source: retired() })
    },
  }
}

/**
 * Search engines and link previews (Oct 31 2026): once the build is written, each public page of the website gets its
 * own copy of the built index.html, with its title, description, canonical, share tags, JSON-LD and a <noscript>
 * outline (its H1, intro and links): the pages in src/seo/routes.js, every speaker (Sanity's public CDN) and every
 * Catalyst Awards winner (the API), at <page>/index.html, plus sitemap.xml. index.html becomes the home page's;
 * spa.html (the plain site) is what vercel.json serves for every other address. Static files only. If Sanity or the
 * API doesn't answer in time, the fixed pages are still written and the build goes on (src/seo/prerender.mjs).
 */
function ttfcPrerender() {
  return {
    name: 'ttfc-prerender',
    // vite preview: /awards, /speakers/<slug>… serve their own file, as on Vercel (else the usual fallback).
    configurePreviewServer(server) {
      const out = resolve(server.config.root, server.config.build.outDir)
      server.middlewares.use((req, _res, next) => {
        const [path, query] = (req.url || '').split('?')
        if (/^(\/[a-z0-9-]+)+$/.test(path) && existsSync(join(out, path, 'index.html'))) req.url = `${path}/index.html${query ? `?${query}` : ''}`
        next()
      })
    },
    async writeBundle(options, bundle) {
      const shell = bundle['index.html']
      if (!shell) throw new Error('ttfc-prerender: the build has no index.html')
      const r = await prerenderSite({ outDir: options.dir, shell: String(shell.source) })
      console.log(`ttfc-prerender: ${r.pages} pages, ${r.speakers} speakers, ${r.winners} award winners; ${r.urls} addresses listed for search engines`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ttfcAppPwa(), ttfcDeskPwa(), ttfcPrerender()],
  define: {
    __TTFC_APP_BUILD__: JSON.stringify(buildId()),
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app/index.html', import.meta.url)),
        desk: fileURLToPath(new URL('./desk/index.html', import.meta.url)),
        // /get-app: the check-in desk's lobby QR code (src/lib/getApp.js): on to the phone's own store.
        getApp: fileURLToPath(new URL('./get-app/index.html', import.meta.url)),
      },
    },
  },
})
