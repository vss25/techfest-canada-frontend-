// src/utils/sanity.js

import { createClient } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";

export const client = createClient({
  projectId: "021qtoci",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
});

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
