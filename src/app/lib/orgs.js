import { useMemo } from "react";
import { get, isDemoApi } from "./api";
import { createStore, local, useStore } from "./store";
import { auth } from "./auth";
import { categoryLabelOf, cms, sponsorsShown } from "./cms";
import { fileURL } from "./config";
import { companyKey } from "./orgKey";
import { sized, TILE } from "./imageCdn";

/* =========================================================
   Attending organisations (Oct 21 2026): one deduplicated list
   from GET /api/app/organisations (public), built by the server:
   `featured` = the sponsors (Featured Partners row, in the admin
   panel's order) and `attending` = everyone else: the website's
   partners, the speakers' organisations and the organisation of
   everyone with a pass, most attendees first. It updates on its
   own as people join. The last good copy stays on the device;
   with none (offline on first launch, an older server) the CMS
   partner list stands in, as before.
========================================================= */

const KEY = "ttfc.app.orgs.v1";
const cached = local.json(KEY, null);

export const orgs = createStore({
  featured: Array.isArray(cached?.featured) ? cached.featured : [],
  attending: Array.isArray(cached?.attending) ? cached.attending : [],
  updatedAt: cached?.updatedAt || "",
  fromServer: !!cached,
  demo: false, // the demo backend's list (lib/demo.js): never saved, never shown outside the demo
  at: 0,
});

let inflight = null;
/** Re-reads the list (at most once a minute unless forced). Keeps the last copy if it fails. */
export function refreshOrganisations({ force = false } = {}) {
  if (!force && Date.now() - orgs.get().at < 60000) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const demo = isDemoApi();
      const r = await get("app/organisations", { auth: false });
      if (r && Array.isArray(r.featured) && Array.isArray(r.attending)) {
        const next = { featured: r.featured, attending: r.attending, updatedAt: r.updatedAt || "" };
        if (!demo) local.setJSON(KEY, next);
        orgs.set({ ...next, fromServer: true, demo, at: Date.now() });
      } else {
        orgs.set({ at: Date.now() });
      }
    } catch {
      orgs.set({ at: Date.now() }); // retried on the next screen visit after a minute
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** A logo ready for a tile: sized by Sanity's / Cloudinary's pipelines (lib/imageCdn.js), server paths absolute. */
function logoURL(raw) {
  const u = String(raw || "").trim();
  if (!u) return "";
  return sized(fileURL(u), TILE.w, TILE.h);
}

/** Logo size: a factor (1 = normal) or the CMS's percentage (100). */
function scaleOf(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(2.5, Math.max(0.3, n > 3 ? n / 100 : n));
}
const count = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : 0);

/** One server organisation (key, name, logo, logoSource, website, kind, topics, description, scale, attendeeCount,
    speakerCount, aliases) as the screens use it. */
export function orgView(o, sponsor = false) {
  const name = String(o?.name || "").trim();
  const key = String(o?.key || "") || companyKey(name);
  return {
    key, id: key, name, displayName: name,
    logo: logoURL(o?.logo), logoSource: String(o?.logoSource || ""),
    website: String(o?.website || ""), kind: String(o?.kind || ""), categoryLabel: categoryLabelOf(o?.kind),
    topics: Array.isArray(o?.topics) ? o.topics.filter((t) => typeof t === "string") : [],
    description: typeof o?.description === "string" ? o.description.trim() : "",
    scale: scaleOf(o?.scale), attendeeCount: count(o?.attendeeCount), speakerCount: count(o?.speakerCount),
    // Other names staff merged into this one (their keys): the partner sheet finds people under those too.
    aliases: Array.isArray(o?.aliases) ? o.aliases.map((k) => companyKey(k)).filter(Boolean) : [],
    isSponsor: sponsor, sample: !!o?.sample,
  };
}

/** The CMS partners in the same shape (the fallback): sponsors first, then the rest with a logo, one per key. */
function fromCMS(c, demo) {
  const asOrg = (p, sponsor) => ({ ...orgView({ ...p, name: p.displayName, kind: p.category, logo: "" }, sponsor), logo: p.logo, logoSource: p.logo ? "website" : "", sample: !!p.sample });
  const featured = sponsorsShown(c, { demo }).map((p) => asOrg(p, true));
  const seen = new Set(featured.map((o) => o.key));
  const attending = [];
  for (const p of c.partners) {
    if (!p.logo || p.isSponsor) continue;
    const o = asOrg(p, false);
    if (!o.key || seen.has(o.key)) continue;
    seen.add(o.key);
    attending.push(o);
  }
  return { featured, attending };
}

/** { featured, attending, total, loaded }: the server's list when there is one, else the CMS partners. */
export function useOrganisations() {
  const o = useStore(orgs);
  const c = useStore(cms);
  const { mode } = useStore(auth);
  return useMemo(() => {
    const server = o.fromServer && o.demo === (mode === "demo") && (o.featured.length || o.attending.length);
    const list = server
      ? { featured: o.featured.map((x) => orgView(x, true)).filter((x) => x.name), attending: o.attending.map((x) => orgView(x)).filter((x) => x.name) }
      : fromCMS(c, mode === "demo");
    return { ...list, total: list.featured.length + list.attending.length, loaded: !!server || c.loaded };
  }, [o, c, mode]);
}
