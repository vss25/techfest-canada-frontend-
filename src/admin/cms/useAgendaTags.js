import { useState } from "react";
import { useApi } from "../hooks";
import { adminFetch } from "../api";

/* The extra tech pillars and sectors staff have added for the agenda (backend /api/console/agenda-tags,
   Nov 26 2026). add("pillars" | "sectors", name) saves the longer list and resolves to the name as saved. */
export function useAgendaTags() {
  const res = useApi("/console/agenda-tags");
  const [local, setLocal] = useState(null);
  const tags = local || res.data || { pillars: [], sectors: [] };
  const add = async (kind, name) => {
    const clean = String(name || "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!clean) return "";
    const have = (tags[kind] || []).find((x) => x.toLowerCase() === clean.toLowerCase());
    if (have) return have;
    const next = { pillars: tags.pillars || [], sectors: tags.sectors || [], [kind]: [...(tags[kind] || []), clean] };
    const saved = await adminFetch("/console/agenda-tags", { method: "PUT", body: next });
    setLocal({ pillars: saved?.pillars || next.pillars, sectors: saved?.sectors || next.sectors });
    return clean;
  };
  return { tags, add, error: res.error };
}
