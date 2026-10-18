import { useEffect, useRef, useState } from "react";

/* =========================================================
   Phone illustrations for the install guide: the real Share,
   ••• and ⋮ buttons drawn where they sit on screen, with a
   pulsing ring on the one to tap. Two-tap steps show the
   menu already open, with the taps numbered 1 and 2.
   Plain inline SVG.
========================================================= */

const HI = "#8B52E0";
const INK = "#1d1d1f";
const GREY = "#8e8e93";
const LINE = "#d9d6df";
const PAGE = "#f4f2f7";

function Pulse({ x, y, r = 16 }) {
  return (
    <g aria-hidden="true">
      <circle className="pulse" cx={x} cy={y} r={r} fill="none" stroke={HI} strokeWidth="3" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={HI} strokeWidth="2.5" />
    </g>
  );
}

function PulseRect({ x, y, w, h, rx = 8 }) {
  return (
    <g aria-hidden="true">
      <rect className="pulse" x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={HI} strokeWidth="3" />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="rgba(139,82,224,0.10)" stroke={HI} strokeWidth="2.5" />
    </g>
  );
}

/** A numbered tap badge (1, 2) beside a highlighted control. */
function Num({ x, y, n }) {
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r="8.5" fill={HI} stroke="#fff" strokeWidth="2" />
      <text x={x} y={Number(y) + 3.6} fontSize="10" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">{n}</text>
    </g>
  );
}

/** Rows of a share sheet / menu, with one highlighted (tap 2). */
function SheetList({ x = 22, y, w = 176, rows, hi, icon }) {
  return (
    <g>
      {rows.map((l, i) => (
        <g key={l}>
          <rect x={x} y={y + i * 30} width={w} height="27" rx={6} fill="#fff" />
          <T x={x + 12} y={y + i * 30 + 17.5} size={10} weight={i === hi ? 700 : 400}>{l}</T>
        </g>
      ))}
      {icon && <g fill="none" stroke={INK} strokeWidth="1.5"><rect x={x + w - 24} y={y + hi * 30 + 6} width="15" height="15" rx="4" /><path d={`M${x + w - 16.5} ${y + hi * 30 + 10} v7 M${x + w - 20} ${y + hi * 30 + 13.5} h7`} /></g>}
      <PulseRect x={x - 2} y={y + hi * 30 - 2} w={w + 4} h="31" rx="7" />
      <Num x={x + w - 2} y={y + hi * 30 - 2} n="2" />
    </g>
  );
}

/** `crop` = [top, height] zooms in on the part of the screen that matters. */
function Phone({ children, title, dark = false, crop }) {
  const [y0, h] = crop || [0, 440];
  const style = crop ? { width: "min(300px, 82vw)", height: "auto", maxHeight: "40dvh" } : undefined;
  return (
    <svg viewBox={`0 ${y0} 220 ${h}`} role="img" aria-label={title} style={style}>
      <rect x="4" y="4" width="212" height="432" rx="34" fill="#16112a" />
      <rect x="12" y="12" width="196" height="416" rx="27" fill={dark ? "#0e0828" : PAGE} />
      <rect x="82" y="20" width="56" height="16" rx="8" fill="#16112a" />
      {children}
    </svg>
  );
}

/** Lines that stand in for page content. */
function Content({ y = 60, n = 6 }) {
  return (
    <g aria-hidden="true">
      <rect x="28" y={y} width="164" height="70" rx="10" fill="#e6e1ee" />
      {Array.from({ length: n }, (_, i) => <rect key={i} x="28" y={y + 84 + i * 16} width={i % 3 === 2 ? 100 : 164} height="8" rx="4" fill="#e1dde8" />)}
    </g>
  );
}

function ShareIcon({ x, y, s = 1, color = "#0a84ff" }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-6 -2 h-3 v13 h18 v-13 h-3" />
      <path d="M0 4 v-15 M-5 -6 l5 -5 l5 5" />
    </g>
  );
}

function Dots({ x: xs, y: ys, vertical = false, color = INK }) {
  const x = Number(xs), y = Number(ys);
  return (
    <g fill={color}>
      {[-6, 0, 6].map((d) => <circle key={d} cx={vertical ? x : x + d} cy={vertical ? y + d : y} r="2.2" />)}
    </g>
  );
}

function AppIcon({ x, y, s: ss = 40 }) {
  const s = Number(ss);
  return <image href="/app/icons/icon-192.png" x={x} y={y} width={s} height={s} style={{ clipPath: `inset(0 round ${s * 0.22}px)` }} preserveAspectRatio="xMidYMid slice" />;
}

function Address({ y: ys, x: xs = 40, w: ws = 140, text = "thetechfestival.com" }) {
  const x = Number(xs), y = Number(ys), w = Number(ws);
  return (
    <g>
      <rect x={x} y={y} width={w} height="26" rx="13" fill="#ffffff" stroke={LINE} />
      <text x={x + w / 2} y={y + 17} textAnchor="middle" fontSize="10" fill={INK} fontFamily="-apple-system, sans-serif">{text}</text>
    </g>
  );
}

const T = ({ x, y, children, size = 11, weight = 400, color = INK, anchor = "start" }) => (
  <text x={x} y={y} fontSize={size} fontWeight={weight} fill={color} textAnchor={anchor} fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">{children}</text>
);

const SHEET_ROWS = ["Copy", "Add to Reading List", "Add Bookmark", "Add to Home Screen"];

const MOCKS = {
  // iPhone Safari (iOS 18 and earlier): 1 Share in the toolbar, 2 Add to Home Screen in the sheet.
  "ios-share-add": () => (
    <Phone crop={[150, 290]} title="Safari: tap the Share button at the bottom (1), then Add to Home Screen in the list (2)">
      <rect x="12" y="12" width="196" height="416" rx="27" fill="rgba(0,0,0,0.18)" />
      <rect x="16" y="168" width="188" height="186" rx="16" fill="#efeef3" />
      <AppIcon x="28" y="180" s="26" />
      <T x="62" y="192" size={10.5} weight={700}>TTFC 2026</T>
      <T x="62" y="205" size={8.5} color={GREY}>thetechfestival.com</T>
      <SheetList y={222} rows={SHEET_ROWS} hi={3} icon />
      <rect x="12" y="364" width="196" height="64" fill="#f9f9fb" />
      <g fill="none" stroke="#0a84ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M38 392 l-6 6 l6 6" /><path d="M66 392 l6 6 l-6 6" />
        <path d="M140 391 h12 v14 h-12 z M146 391 v14" /><rect x="168" y="392" width="13" height="13" rx="3" /><rect x="172" y="388" width="13" height="13" rx="3" />
      </g>
      <ShareIcon x="110" y="399" />
      <Pulse x="110" y="397" r="16" />
      <Num x="128" y="383" n="1" />
    </Phone>
  ),
  // iPhone Safari on iOS 26: 1 ••• at the right of the address bar, 2 Share at the top of the menu.
  "ios26-more-share": () => (
    <Phone crop={[200, 240]} title="Safari on iOS 26: tap ••• at the bottom right (1), then Share at the top of the menu (2)">
      <Content y="60" n={4} />
      <rect x="62" y="226" width="140" height="140" rx="16" fill="#ffffff" stroke={LINE} />
      {["Share", "Add to Bookmarks", "Add Bookmark to…", "New Tab"].map((l, i) => (
        <T key={l} x="78" y={252 + i * 30} size={10} weight={i === 0 ? 700 : 400}>{l}</T>
      ))}
      <ShareIcon x="188" y="250" s={0.75} color={INK} />
      <PulseRect x="66" y="232" w="132" h="30" rx="8" />
      <Num x="196" y="232" n="2" />
      <rect x="24" y="378" width="140" height="38" rx="19" fill="#ffffff" stroke={LINE} />
      <T x="94" y="401" size={10} anchor="middle">thetechfestival.com</T>
      <circle cx="184" cy="397" r="19" fill="#ffffff" stroke={LINE} />
      <Dots x="184" y="397" />
      <Pulse x="184" y="397" r="17" />
      <Num x="199" y="380" n="1" />
    </Phone>
  ),
  // iOS 26 share sheet: 1 View More, 2 Add to Home Screen.
  "ios26-viewmore-add": () => (
    <Phone crop={[196, 236]} title="The Share sheet: tap View More (1), then Add to Home Screen (2)">
      <rect x="12" y="200" width="196" height="228" rx="18" fill="#efeef3" />
      <AppIcon x="26" y="214" s="28" />
      <T x="62" y="226" size={11} weight={700}>TTFC 2026</T>
      <T x="62" y="240" size={9} color={GREY}>thetechfestival.com</T>
      {["Copy", "Bookmarks", "Reading List", "View More"].map((l, i) => (
        <g key={l}>
          <circle cx={40 + i * 47} cy="284" r="17" fill="#e3e1e8" />
          <T x={40 + i * 47} y="316" size={7.5} anchor="middle">{l}</T>
        </g>
      ))}
      <path d="M175 280 l6 6 l6 -6" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <Pulse x={181} y={284} r={19} />
      <Num x="198" y="266" n="1" />
      <SheetList y={334} rows={["Find on Page", "Add to Home Screen", "Markup"]} hi={1} icon />
    </Phone>
  ),
  // Chrome on iPhone: 1 Share in the address bar, 2 Add to Home Screen.
  "ios-chrome-share-add": () => (
    <Phone crop={[24, 330]} title="Chrome on iPhone: tap the Share icon in the address bar (1), then Add to Home Screen (2)">
      <rect x="12" y="40" width="196" height="40" fill="#f9f9fb" />
      <Address y="47" x="24" w="140" />
      <ShareIcon x="186" y="62" color={INK} />
      <Pulse x="186" y="60" r="15" />
      <Num x="201" y="44" n="1" />
      <rect x="12" y="12" width="196" height="416" rx="27" fill="rgba(0,0,0,0.12)" />
      <rect x="16" y="206" width="188" height="148" rx="16" fill="#efeef3" />
      <SheetList y={222} rows={SHEET_ROWS} hi={3} icon />
    </Phone>
  ),
  // Edge on iPhone: 1 Share in the bottom toolbar, 2 Add to Home Screen.
  "ios-edge-share-add": () => (
    <Phone crop={[150, 290]} title="Edge on iPhone: tap the Share icon at the bottom (1), then Add to Home Screen (2)">
      <rect x="12" y="12" width="196" height="416" rx="27" fill="rgba(0,0,0,0.12)" />
      <rect x="16" y="190" width="188" height="164" rx="16" fill="#efeef3" />
      <SheetList y={222} rows={SHEET_ROWS} hi={3} icon />
      <rect x="12" y="368" width="196" height="60" fill="#f9f9fb" />
      <ShareIcon x="110" y="398" color={INK} />
      <Pulse x="110" y="396" r="16" />
      <Num x="128" y="381" n="1" />
      <Dots x="176" y="396" />
    </Phone>
  ),
  // Android Chrome (and Firefox): 1 ⋮ at the top right, 2 Install app in the menu.
  "android-dots-install": ({ item = "Install app" } = {}) => (
    <Phone crop={[30, 260]} title={`The browser: tap ⋮ at the top right (1), then ${item} (2)`}>
      <rect x="12" y="40" width="196" height="40" fill="#ffffff" />
      <Address y="47" x="22" w="120" />
      <Dots x="196" y="60" vertical />
      <Pulse x="196" y="60" r="12" />
      <Num x="180" y="46" n="1" />
      <Content y="96" />
      <rect x="64" y="84" width="138" height="186" rx="8" fill="#fff" stroke={LINE} />
      {["New tab", "History", "Downloads"].map((l, i) => <T key={l} x="78" y={108 + i * 30}>{l}</T>)}
      <T x="78" y="198" weight={700}>{item}</T>
      <g fill="none" stroke={INK} strokeWidth="1.6"><rect x="178" y="186" width="14" height="16" rx="3" /><path d="M185 190 v7 M182 194 l3 3 l3 -3" /></g>
      <T x="78" y="234">Settings</T>
      <PulseRect x="68" y="180" w="130" h="28" rx="6" />
      <Num x="200" y="180" n="2" />
    </Phone>
  ),
  // Edge on Android: 1 ••• at the bottom, 2 Add to phone / Install app.
  "android-edge-install": () => (
    <Phone crop={[200, 240]} title="Edge on Android: tap ••• at the bottom (1), then Install app (2)">
      <Content y="60" n={4} />
      <rect x="12" y="12" width="196" height="416" rx="27" fill="rgba(0,0,0,0.18)" />
      <rect x="12" y="246" width="196" height="128" rx="16" fill="#fff" />
      {["Favourites", "History", "Install app", "Settings"].map((l, i) => <T key={l} x="30" y={272 + i * 28} weight={i === 2 ? 700 : 400}>{l}</T>)}
      <PulseRect x="22" y="314" w="176" h="26" rx="6" />
      <Num x="196" y="314" n="2" />
      <rect x="12" y="380" width="196" height="48" fill="#ffffff" />
      <Dots x="110" y="404" />
      <Pulse x="110" y="404" r="15" />
      <Num x="126" y="389" n="1" />
    </Phone>
  ),
  // Samsung Internet: 1 ≡ at the bottom right, 2 Add page to › Home screen.
  "android-samsung-install": () => (
    <Phone crop={[200, 240]} title="Samsung Internet: tap ≡ at the bottom right (1), then Add page to › Home screen (2)">
      <Content y="60" n={4} />
      <rect x="12" y="12" width="196" height="416" rx="27" fill="rgba(0,0,0,0.18)" />
      <rect x="12" y="246" width="196" height="128" rx="16" fill="#fff" />
      {["Bookmarks", "Downloads", "Add page to", "Settings"].map((l, i) => <T key={l} x="30" y={272 + i * 28} weight={i === 2 ? 700 : 400}>{l}</T>)}
      <T x="190" y="328" size={10} color={GREY} anchor="end">Home screen ›</T>
      <PulseRect x="22" y="314" w="176" h="26" rx="6" />
      <Num x="196" y="314" n="2" />
      <rect x="12" y="380" width="196" height="48" fill="#ffffff" />
      <g fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round">
        <path d="M34 398 l-6 6 l6 6" /><path d="M64 398 l6 6 l-6 6" /><path d="M100 410 v-8 l10 -8 l10 8 v8 z" />
        <rect x="136" y="397" width="14" height="14" rx="3" />
        <path d="M174 398 h16 M174 404 h16 M174 410 h16" />
      </g>
      <Pulse x="182" y="404" r="15" />
      <Num x="198" y="389" n="1" />
    </Phone>
  ),
  // In-app browsers: 1 ••• / ⋮, 2 Open in Safari / Chrome.
  "inapp-ios-open": () => (
    <Phone crop={[24, 220]} title="An app's built-in browser: tap ••• at the top right (1), then Open in Safari (2)">
      <rect x="12" y="40" width="196" height="40" fill="#ffffff" />
      <g stroke={INK} strokeWidth="2" strokeLinecap="round"><path d="M26 54 l10 10 M36 54 l-10 10" /></g>
      <T x="104" y="64" size={10} anchor="middle">thetechfestival.com</T>
      <Dots x="190" y="60" />
      <Pulse x="190" y="60" r="14" />
      <Num x="174" y="46" n="1" />
      <Content y="96" />
      <rect x="70" y="84" width="132" height="120" rx="10" fill="#fff" stroke={LINE} />
      <T x="84" y="112" weight={700}>Open in Safari</T>
      <T x="84" y="146">Copy link</T>
      <T x="84" y="180">Share via…</T>
      <PulseRect x="74" y="94" w="124" h="28" rx="6" />
      <Num x="200" y="94" n="2" />
    </Phone>
  ),
  "inapp-android-open": () => (
    <Phone crop={[24, 220]} title="An app's built-in browser: tap ⋮ at the top right (1), then Open in Chrome (2)">
      <rect x="12" y="40" width="196" height="40" fill="#ffffff" />
      <g stroke={INK} strokeWidth="2" strokeLinecap="round"><path d="M26 54 l10 10 M36 54 l-10 10" /></g>
      <T x="104" y="64" size={10} anchor="middle">thetechfestival.com</T>
      <Dots x="192" y="60" vertical />
      <Pulse x="192" y="60" r="13" />
      <Num x="176" y="46" n="1" />
      <Content y="96" />
      <rect x="70" y="84" width="132" height="120" rx="8" fill="#fff" stroke={LINE} />
      <T x="84" y="112" weight={700}>Open in Chrome</T>
      <T x="84" y="146">Copy link</T>
      <T x="84" y="180">Share</T>
      <PulseRect x="74" y="94" w="124" h="28" rx="6" />
      <Num x="200" y="94" n="2" />
    </Phone>
  ),
  // Chrome on a computer: 1 the install icon in the address bar, 2 Install in the box.
  "desktop-install-combo": () => (
    <svg viewBox="0 0 320 210" role="img" aria-label="Click the install icon in the address bar (1), then Install in the box that opens (2)">
      <rect x="10" y="10" width="300" height="180" rx="12" fill="#16112a" />
      <rect x="18" y="18" width="284" height="164" rx="7" fill={PAGE} />
      <rect x="18" y="18" width="284" height="30" rx="7" fill="#fff" />
      <rect x="40" y="24" width="220" height="18" rx="9" fill={PAGE} />
      <text x="52" y="37" fontSize="9" fill={INK} fontFamily="-apple-system, sans-serif">thetechfestival.com/app/</text>
      <g fill="none" stroke={INK} strokeWidth="1.5"><rect x="240" y="28" width="12" height="10" rx="2" /><path d="M246 30 v5 M244 33 l2 2 l2 -2" /></g>
      <Pulse x="246" y="33" r="11" />
      <Num x="262" y="22" n="1" />
      <rect x="150" y="54" width="148" height="92" rx="10" fill="#fff" stroke={LINE} />
      <T x="162" y="74" size={11} weight={700}>Install app?</T>
      <AppIcon x="162" y="84" s="26" />
      <T x="196" y="96" size={10} weight={600}>TTFC</T>
      <T x="196" y="108" size={8} color={GREY}>thetechfestival.com</T>
      <rect x="200" y="120" width="44" height="18" rx="9" fill="#e7e5ec" /><T x="222" y="133" size={9} anchor="middle">Cancel</T>
      <rect x="248" y="120" width="44" height="18" rx="9" fill={HI} /><T x="270" y="133" size={9} weight={700} color="#fff" anchor="middle">Install</T>
      <PulseRect x={245} y={117} w={50} h={24} rx={12} />
      <Num x="296" y="116" n="2" />
    </svg>
  ),
  open: () => (
    <Phone title="The TTFC app page open in the browser">
      <AppIcon x="80" y="96" s="60" />
      <T x="110" y="182" size={15} weight={700} anchor="middle">TTFC 2026</T>
      <T x="110" y="200" size={10} color={GREY} anchor="middle">Schedule · Live polls · Chat</T>
      <rect x="40" y="222" width="140" height="30" rx="10" fill={HI} />
      <T x="110" y="241" size={11} weight={700} color="#fff" anchor="middle">Install the app</T>
      <Address y="380" />
    </Phone>
  ),
  "android-dialog": () => (
    <Phone crop={[120, 190]} title="The Install box: tap Install">
      <Content y="60" />
      <rect x="12" y="12" width="196" height="416" rx="27" fill="rgba(0,0,0,0.35)" />
      <rect x="26" y="150" width="168" height="128" rx="18" fill="#fff" />
      <T x="42" y="178" size={13} weight={700}>Install app</T>
      <AppIcon x="42" y="192" s="32" />
      <T x="84" y="206" size={11} weight={600}>TTFC</T>
      <T x="84" y="220" size={9} color={GREY}>thetechfestival.com</T>
      <T x="118" y="262" color={HI} weight={600} anchor="middle">Cancel</T>
      <T x="168" y="262" color={HI} weight={700} anchor="middle">Install</T>
      <Pulse x="168" y="258" r="18" />
    </Phone>
  ),
  "home-ios": () => (
    <Phone title="Your Home Screen with the TTFC icon" dark>
      {Array.from({ length: 16 }, (_, i) => {
        const x = 30 + (i % 4) * 44, y = 60 + Math.floor(i / 4) * 58;
        return i === 13 ? null : <rect key={i} x={x} y={y} width="34" height="34" rx="8" fill={["#3a2f63", "#4a3b7a", "#2f2752", "#55468a"][i % 4]} />;
      })}
      <AppIcon x="74" y="234" s="34" />
      <T x="91" y="280" size={8.5} color="#fff" anchor="middle">TTFC</T>
      <Pulse x="91" y="251" r="24" />
      <rect x="24" y="374" width="172" height="44" rx="18" fill="rgba(255,255,255,0.12)" />
      <T x="110" y="358" size={8.5} color="rgba(255,255,255,0.7)" anchor="middle">Swipe down here to Search</T>
    </Phone>
  ),
  "home-android": () => (
    <Phone title="Your Home screen with the TTFC icon" dark>
      {Array.from({ length: 12 }, (_, i) => {
        const x = 36 + (i % 4) * 42, y = 70 + Math.floor(i / 4) * 60;
        return i === 9 ? null : <circle key={i} cx={x + 14} cy={y + 14} r="15" fill={["#3a2f63", "#4a3b7a", "#2f2752", "#55468a"][i % 4]} />;
      })}
      <AppIcon x="63" y="185" s="32" />
      <T x="79" y="232" size={8.5} color="#fff" anchor="middle">TTFC</T>
      <Pulse x="79" y="201" r="23" />
      <path d="M96 392 l14 -8 l14 8" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
      <T x="110" y="410" size={8.5} color="rgba(255,255,255,0.7)" anchor="middle">Swipe up for all apps</T>
    </Phone>
  ),
  copy: () => (
    <Phone crop={[200, 160]} title="Copy the link">
      <Content y="60" n={3} />
      <rect x="24" y="250" width="172" height="34" rx="10" fill="#fff" stroke={LINE} />
      <T x="34" y="271" size={9.5}>thetechfestival.com/app/…</T>
      <rect x="48" y="296" width="124" height="34" rx="10" fill={HI} />
      <T x="110" y="317" weight={700} color="#fff" anchor="middle">Copy link</T>
      <PulseRect x="46" y="294" w="128" h="38" rx="11" />
    </Phone>
  ),
  "desktop-dialog": () => (
    <svg viewBox="0 0 320 210" role="img" aria-label="The browser's Install app box: click Install">
      <rect x="10" y="10" width="300" height="180" rx="12" fill="#16112a" />
      <rect x="18" y="18" width="284" height="164" rx="7" fill={PAGE} />
      <rect x="18" y="18" width="284" height="30" rx="7" fill="#fff" />
      <rect x="150" y="52" width="148" height="92" rx="10" fill="#fff" stroke={LINE} />
      <T x="162" y="72" size={11} weight={700}>Install app?</T>
      <AppIcon x="162" y="82" s="26" />
      <T x="196" y="94" size={10} weight={600}>TTFC</T>
      <T x="196" y="106" size={8} color={GREY}>thetechfestival.com</T>
      <rect x="200" y="118" width="44" height="18" rx="9" fill="#e7e5ec" /><T x="222" y="131" size={9} anchor="middle">Cancel</T>
      <rect x="248" y="118" width="44" height="18" rx="9" fill={HI} /><T x="270" y="131" size={9} weight={700} color="#fff" anchor="middle">Install</T>
      <PulseRect x={245} y={115} w={50} h={24} rx={12} />
    </svg>
  ),
  "edge-menu": () => (
    <svg viewBox="0 0 320 210" role="img" aria-label="Edge's ••• menu: Apps, then Install this site as an app">
      <rect x="10" y="10" width="300" height="180" rx="12" fill="#16112a" />
      <rect x="18" y="18" width="284" height="164" rx="7" fill={PAGE} />
      <rect x="18" y="18" width="284" height="30" rx="7" fill="#fff" />
      <Address y={20} x={40} w={200} text="thetechfestival.com/app/" />
      <Dots x={286} y={33} />
      <Pulse x={286} y={33} r={10} />
      <Num x={272} y={24} n="1" />
      <rect x="150" y="50" width="146" height="70" rx="6" fill="#fff" stroke={LINE} />
      <T x="160" y="68" size={10}>New tab</T>
      <T x="160" y="88" size={10} weight={700}>Apps ›</T>
      <T x="160" y="108" size={10}>Settings</T>
      <rect x="120" y="92" width="170" height="26" rx="6" fill="#fff" stroke={LINE} />
      <T x="130" y="109" size={9.5} weight={700}>Install this site as an app</T>
      <PulseRect x={118} y={90} w={174} h={30} rx={7} />
      <Num x={292} y={90} n="2" />
    </svg>
  ),
  "mac-file-menu": () => (
    <svg viewBox="0 0 320 210" role="img" aria-label="Safari's File menu: Add to Dock">
      <rect x="10" y="10" width="300" height="180" rx="12" fill="#16112a" />
      <rect x="18" y="18" width="284" height="164" rx="7" fill={PAGE} />
      <rect x="18" y="18" width="284" height="16" fill="#e9e7ee" />
      <T x="28" y="30" size={9} weight={700}>Safari</T>
      <T x="66" y="30" size={9} weight={700} color={HI}>File</T>
      <PulseRect x={60} y={20} w={28} h={13} rx={4} />
      <Num x={92} y={22} n="1" />
      <T x="92" y="30" size={9}>Edit</T>
      <T x="116" y="30" size={9}>View</T>
      <rect x="58" y="36" width="130" height="96" rx="6" fill="#fff" stroke={LINE} />
      {["New Window", "New Tab", "Open File…", "Share"].map((l, i) => <T key={l} x={68} y={52 + i * 16} size={9}>{l}</T>)}
      <T x="68" y="122" size={9.5} weight={700}>Add to Dock…</T>
      <PulseRect x={60} y={110} w={126} h={18} rx={4} />
      <Num x={190} y={110} n="2" />
    </svg>
  ),
  "mac-dock": () => (
    <svg viewBox="0 0 320 210" role="img" aria-label="The Dock with the TTFC icon">
      <rect x="10" y="10" width="300" height="180" rx="12" fill="#16112a" />
      <rect x="18" y="18" width="284" height="164" rx="7" fill="#3b2f6b" />
      <rect x="60" y="146" width="200" height="30" rx="10" fill="rgba(255,255,255,0.25)" />
      {[0, 1, 2, 4].map((i) => <rect key={i} x={70 + i * 38} y="150" width="22" height="22" rx="6" fill={["#5a8cff", "#34c759", "#ff9f0a", "#bf5af2"][i % 4]} />)}
      <AppIcon x={146} y={150} s={22} />
      <Pulse x={157} y={161} r={17} />
      <T x="157" y="140" size={9} color="#fff" anchor="middle">TTFC</T>
    </svg>
  ),
  "win-start": () => (
    <svg viewBox="0 0 320 210" role="img" aria-label="The Start menu: search TTFC">
      <rect x="10" y="10" width="300" height="180" rx="12" fill="#16112a" />
      <rect x="18" y="18" width="284" height="164" rx="7" fill="#1f3b63" />
      <rect x="80" y="36" width="160" height="120" rx="8" fill="#f3f3f3" />
      <rect x="92" y="46" width="136" height="18" rx="9" fill="#fff" stroke={LINE} /><T x="102" y="59" size={9}>TTFC</T>
      <AppIcon x={96} y={76} s={26} />
      <T x="130" y="88" size={10} weight={700}>TTFC</T>
      <T x="130" y="100" size={8} color={GREY}>App</T>
      <PulseRect x={92} y={72} w={136} h={34} rx={6} />
      <rect x="18" y="164" width="284" height="18" fill="#e9eef5" />
      <rect x="150" y="167" width="12" height="12" rx="2" fill="#0a64c8" />
    </svg>
  ),
  desktop: () => (
    <svg viewBox="0 0 320 210" role="img" aria-label="A computer browser with the install icon in the address bar">
      <rect x="10" y="10" width="300" height="180" rx="12" fill="#16112a" />
      <rect x="18" y="18" width="284" height="164" rx="7" fill={PAGE} />
      <rect x="18" y="18" width="284" height="30" rx="7" fill="#fff" />
      <rect x="60" y="24" width="200" height="18" rx="9" fill={PAGE} />
      <text x="72" y="37" fontSize="9" fill={INK} fontFamily="-apple-system, sans-serif">thetechfestival.com/app/</text>
      <g fill="none" stroke={INK} strokeWidth="1.5"><rect x="240" y="28" width="12" height="10" rx="2" /><path d="M246 30 v5 M244 33 l2 2 l2 -2" /></g>
      <Pulse x="246" y="33" r="11" />
      <AppIcon x="135" y="80" s="50" />
    </svg>
  ),
};

/** Sizes of the clips in public/app/guide/ (so the box is right before the video loads). */
const CLIP_SIZE = { "ios26-share": [360, 484], "ios26-add": [340, 550], "android-menu": [300, 646], "android-install": [300, 646] };

/** A short screen recording of the real steps, played like a GIF (the poster frame instead with reduced motion). */
export function GuideClip({ name, label }) {
  const ref = useRef(null);
  const [reduce] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.play?.().catch(() => { /* the poster stays; it's only a demo */ });
  }, [name]);
  const poster = `/app/guide/${name}.webp`;
  const [w, h] = CLIP_SIZE[name] || [320, 560];
  return (
    <div className="mock mock--clip">
      {reduce
        ? <img src={poster} alt={label} width={w} height={h} />
        : <video ref={ref} key={name} poster={poster} width={w} height={h} autoPlay muted loop playsInline preload="auto" aria-label={label} disablePictureInPicture>
            <source src={`/app/guide/${name}.mp4`} type="video/mp4" />
          </video>}
    </div>
  );
}

export default function InstallMockup({ name, item }) {
  const M = MOCKS[name] || MOCKS.open;
  return <div className="mock"><M item={item} /></div>;
}
