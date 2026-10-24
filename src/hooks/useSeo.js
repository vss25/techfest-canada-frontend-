import { useEffect } from "react";

/** A page's title and description for search engines and link previews, put back when leaving.
    Used by /stay-updated and /programme. */
export default function useSeo(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    const set = (sel, attr, value) => {
      let el = document.head.querySelector(sel);
      let created = false;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr.name, attr.value);
        document.head.appendChild(el);
        created = true;
      }
      const before = el.getAttribute("content");
      el.setAttribute("content", value);
      return () => { if (created) el.remove(); else el.setAttribute("content", before ?? ""); };
    };
    const undo = [
      set('meta[name="description"]', { name: "name", value: "description" }, description),
      set('meta[property="og:title"]', { name: "property", value: "og:title" }, title),
      set('meta[property="og:description"]', { name: "property", value: "og:description" }, description),
      set('meta[name="twitter:title"]', { name: "name", value: "twitter:title" }, title),
      set('meta[name="twitter:description"]', { name: "name", value: "twitter:description" }, description),
    ];
    return () => { document.title = prevTitle; undo.forEach((fn) => fn()); };
  }, [title, description]);
}
