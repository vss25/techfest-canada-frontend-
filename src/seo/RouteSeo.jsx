import { useState } from "react";
import { useLocation } from "react-router-dom";
import useSeo from "../hooks/useSeo";
import { GENERIC_HEAD, seoForPath } from "./routes";

/* =========================================================
   <RouteSeo/> (Oct 31 2026), once inside the router (App.jsx): on
   every navigation, the address's title, description, canonical,
   og:url, robots, share image and JSON-LD from src/seo/routes.js,
   the same the build wrote into that address's own HTML file. A
   page's own useSeo goes over it (the speaker and winner pages
   once loaded, /stay-updated's CMS wording, the not-found page).
   Unknown addresses get no canonical; noindex pages get noindex.
   Both get the plain site's title, description and image (a page's
   own title still wins). A speaker or winner
   opened on their own prerendered file keeps that file's head
   while their data loads (the canonical the HTML came with).
========================================================= */

const NONE = { ...GENERIC_HEAD, canonical: null, jsonLd: null };

export default function RouteSeo() {
  const { pathname } = useLocation();
  // Read once, before any useSeo has run: the canonical of the HTML file this visit started on (none in spa.html).
  const [loadedCanonical] = useState(() => document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") || null);
  const seo = seoForPath(pathname, loadedCanonical) || NONE;
  useSeo(seo.title, seo.description, {
    level: 0, canonical: seo.canonical, robots: seo.robots, image: seo.image, jsonLd: seo.jsonLd,
  });
  return null;
}
