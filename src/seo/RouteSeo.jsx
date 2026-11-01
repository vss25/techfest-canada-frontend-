import { useLocation } from "react-router-dom";
import useSeo from "../hooks/useSeo";
import { seoForPath } from "./routes";

/* =========================================================
   <RouteSeo/> (Oct 31 2026), once inside the router (App.jsx): on
   every navigation, the address's title, description, canonical,
   og:url, robots, share image and JSON-LD from src/seo/routes.js,
   the same the build wrote into that address's own HTML file. A
   page's own useSeo goes over it (the speaker and winner pages
   once loaded, /stay-updated's CMS wording, the not-found page).
   Unknown addresses get no canonical; noindex pages get noindex
   and keep the title they set themselves.
========================================================= */

const NONE = { canonical: null, jsonLd: null };

export default function RouteSeo() {
  const { pathname } = useLocation();
  const seo = seoForPath(pathname) || NONE;
  useSeo(seo.title, seo.description, {
    level: 0, canonical: seo.canonical, robots: seo.robots, image: seo.image, jsonLd: seo.jsonLd,
  });
  return null;
}
