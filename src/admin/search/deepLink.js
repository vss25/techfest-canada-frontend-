/* =========================================================
   Global search deep links into the pages:
     ?q=<text>     a page's own search box starts with it ("See all in …")
     ?edit=<id>    a CMS page opens that document's editor (sessions, speakers, logos)
     ?highlight=   handled once for every page by AdminShell
========================================================= */
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/** The ?q= a page's search box starts with. */
export function useInitialQuery() {
  const [params] = useSearchParams();
  return params.get("q") || "";
}

/**
 * Open the editor for ?edit=<id> as soon as `list` has that document, then take the parameter off the URL
 * (so closing the editor doesn't open it again). `open(doc)` is the page's own "edit this" action.
 */
export function useEditFromUrl(list, open) {
  const [params, setParams] = useSearchParams();
  const id = params.get("edit") || "";
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; });
  useEffect(() => {
    if (!id || !list?.length) return;
    const doc = list.find((x) => x?._id === id);
    const next = new URLSearchParams(params);
    next.delete("edit");
    setParams(next, { replace: true });
    if (doc) openRef.current(doc);
  }, [id, list, params, setParams]);
}
