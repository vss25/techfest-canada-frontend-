import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (no requests to Google Fonts)
import '@fontsource/dm-sans/300.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/400-italic.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
import '@fontsource/orbitron/500.css'
import '@fontsource/orbitron/700.css'
import '@fontsource/orbitron/800.css'
import '@fontsource/orbitron/900.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import "./styles.css";
import App from './App.jsx'
import { loadTrackers } from './lib/trackers'
import { captureLanding } from './lib/purchaseSource'
import { rememberNativeVisit } from './lib/nativeVisit'
import { startSiteCopy } from './lib/siteCopy'

// Analytics/advertising tags load only if the visitor already chose "Accept All" (never on the Catalyst Awards jury portal).
if (!/^\/awards\/jury-admin(\/|$)/i.test(window.location.pathname)) loadTrackers()
// How this visitor found us (kept in this browser; sent only with a checkout, for the team's "New ticket" email).
captureLanding()
// Opened from the iPhone or Android app (?source=ios …): no "Get the TTFC app" banners in this tab (lib/nativeVisit.js).
rememberNativeVisit()

// Staff's changes to the site's built-in wording and pictures (Admin › Content › Website text & media; lib/siteCopy.js).
startSiteCopy()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
