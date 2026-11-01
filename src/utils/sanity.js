// src/utils/sanity.js

import { createImageUrlBuilder } from "@sanity/image-url";

/* The website's CMS reads (Oct 31 2026): a plain fetch to Sanity's API CDN (apicdn) instead of @sanity/client.
   The same GROQ and the same answer, but cached near the visitor (the uncached API answers from Europe), and 28 kB
   (gzipped) less code on every page. The site only reads published content, with no token, and the staff panel edits
   through the backend, so nothing here needs the uncached API. A publish reaches the CDN within seconds.
   client.fetch(query, params) works like @sanity/client's, so the pages using it are unchanged; config() lets
   @sanity/image-url read the project from it. */
const PROJECT_ID = "021qtoci";
const DATASET = "production";
const API_VERSION = "2024-01-01";
const QUERY_URL = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}`;
const MAX_GET = 11264; // @sanity/client's limit: a longer query goes as a POST

async function query(groq, params = {}) {
  const search = new URLSearchParams({ query: groq });
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.append(`$${key}`, JSON.stringify(value));
  search.append("returnQuery", "false");
  const qs = search.toString();
  const res = qs.length < MAX_GET
    ? await fetch(`${QUERY_URL}?${qs}`)
    : await fetch(`${QUERY_URL}?returnQuery=false`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: groq, params }) });
  if (!res.ok) throw new Error(`Sanity query failed (${res.status})`);
  return (await res.json()).result;
}

export const client = {
  fetch: query,
  config: () => ({ projectId: PROJECT_ID, dataset: DATASET, apiVersion: API_VERSION, apiHost: "https://api.sanity.io", useCdn: true }),
};

// Correct image builder (new API)
const builder = createImageUrlBuilder(client);

export function urlFor(source) {
  return builder.image(source);
}

/** Logo size set in the admin panel (logoScale, 30–250 %, default 100) as a factor 0.3–2.5. */
export function logoScaleOf(doc) {
  const n = Number(doc?.logoScale);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(2.5, Math.max(0.3, n / 100));
}

/** Square/fixed-size speaker photo that honours the crop + hotspot set in the admin panel. */
export function speakerPhotoUrl(image, size) {
  if (!image?.asset) return null;
  return builder.image(image).width(size).height(size).fit("crop").auto("format").url();
}
