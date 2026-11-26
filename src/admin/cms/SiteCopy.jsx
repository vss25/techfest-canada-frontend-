import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, EyeOff, Hand, ImageIcon, Monitor, MousePointerClick, RotateCcw, Search, Send, Smartphone, Type, Upload } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, ConfirmDialog, ErrorState, Field, Input, LoadingState, PageHeader, Select, Textarea, focusRing } from "../ui";
import { CmsBanners } from "./CmsParts";
import { ChangeBadge } from "./workflow";
import { stagingUrl } from "./workflowState";
import useCmsStatus from "./useCmsStatus";
import { useAutosave } from "./useAutosave";
import { AutosaveNote } from "./AutosaveNote";
import { uploadImage } from "./imageUpload";
import { EDIT_FRAME } from "../../lib/siteCopy";
import { applyDiff, diffRows, hashText, pageKey, plainRows, rowFor, withRow } from "../../lib/siteCopyRules";
import { SITE_PAGES, pageLabel } from "./siteCopyPages";

/* =========================================================
   Admin › Website › Text & media (Nov 25 2026). The owner: "several copy items on the public
   website can't be edited in the admin panel… every one of those editable… while editing, a preview
   of that particular element, so they can see how the edit changes it and which content they are
   changing, before sending it to staging or publishing live."

   The right half is the real website page in a frame. The left half lists every piece of text,
   picture and video on that page. Click a piece (in the list or on the page) and it is outlined on
   the page; type, and the page changes as you type. Nothing reaches the website until it is saved,
   sent to staging and published, like every other content change (cms/workflow.jsx). Any staff.

   Built-in pieces (the site's own wording and files) are changed here. Pieces that come from records
   (an event's name and date, speakers, partners, ticket prices, agenda…) are listed too, with where
   to change them. Stored as rows of one "siteCopy" document; the website applies them
   (src/lib/siteCopy.js). Backend: /api/cms/siteCopy (services/cmsSchema.js).
========================================================= */

const MSG = "ttfc-copy:";
const DESKTOP_W = 1280;
const PHONE_W = 390;
const RECORD_PAGES = [
  ["content/events", "Event page"], ["content/agenda", "Agenda"], ["content/speakers", "Speakers"],
  ["content/partners", "Partners & sponsors"], ["content/tickets", "Tickets & prices"], ["content/settings", "Website switches"],
];
const idOf = (kind, key) => `${kind}\n${key}`;
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const absolute = (u) => { try { return new URL(u, window.location.origin).toString(); } catch { return ""; } };
const isHttps = (u) => { try { return new URL(u).protocol === "https:"; } catch { return false; } };

/** The site's built-in wording (this build's list, from vite.config.js) as a Set of hashes; null while loading. */
function useBuiltin() {
  const [set, setSet] = useState(null);
  useEffect(() => {
    let live = true;
    import("virtual:ttfc-builtin-copy")
      .then((m) => { if (live) setSet(new Set(String(m.default || "").split(",").filter(Boolean).map((h) => parseInt(h, 36)))); })
      .catch(() => { if (live) setSet(new Set()); });
    return () => { live = false; };
  }, []);
  return set;
}

function ScopeChoice({ scope, page, onChange, count }) {
  const pick = "flex cursor-pointer items-start gap-2 rounded-[9px] border px-3 py-2 text-[13px] leading-[18px]";
  const opt = (value, title, hint) => (
    <label className={`${pick} ${scope === value ? "border-[#D6308C] bg-[#FDF2F8]" : "border-[#E3E0EE] bg-white"}`}>
      <input type="radio" name="copy-scope" className="mt-0.5 accent-[#D6308C]" checked={scope === value} onChange={() => onChange(value)} />
      <span><span className="font-semibold text-ttfc-text">{title}</span><span className="block text-xs text-ttfc-muted">{hint}</span></span>
    </label>
  );
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-1.5 text-[13px] font-semibold text-ttfc-text">Where to change it</legend>
      {opt("all", "Everywhere it appears", count > 1 ? `${count} places on this page, and any other page with the same wording.` : "This page and any other page with the same wording or file.")}
      {opt("page", "Only on this page", `${pageLabel(page)} only. Other pages keep the built-in one.`)}
    </fieldset>
  );
}

function ItemEditor({ item, page, texts, media, setTexts, setMedia, shown, onBrowse, disabled }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const isText = item.kind === "text";
  const rows = isText ? texts : media;
  const setRows = isText ? setTexts : setMedia;
  const hit = rowFor(rows, item.key, page);
  const scope = hit ? hit.scope : "all";
  const at = { match: item.key, page: scope === "page" ? page : "" };
  const [link, setLink] = useState("");
  useEffect(() => { setLink(""); }, [item.id]);

  const change = (value) => setRows((list) => withRow(list, at, value));
  const moveScope = (next) => {
    if (!hit || next === scope) return;
    const { match, page: _old, ...value } = hit.row;
    setRows((list) => withRow(withRow(list, at, null), { match, page: next === "page" ? page : "" }, value));
  };
  const reset = () => change(null);

  const upload = async (file) => {
    if (!file) return;
    if (/^video\//.test(file.type)) { toast.error("Videos are added by link: upload it in Website switches › Large site files (or to YouTube / Vimeo storage), then paste its https address here."); return; }
    setBusy(true);
    try {
      const out = await uploadImage(file, { kind: "photo" });
      change({ url: out.url, ...(hit && hit.row.alt ? { alt: hit.row.alt } : {}) });
      if (file.type === "image/gif") toast.success("Uploaded as a still picture. For an animated GIF, paste its link instead.");
    } catch (e) { toast.error(e); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const notOnPage = !item.count;
  return (
    <Card className="border-[#D6308C]/40">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="pink" icon={isText ? Type : ImageIcon}>{item.role || (isText ? "Text" : "Picture")}</Badge>
        {item.section && <span className="text-xs text-ttfc-muted">in “{clip(item.section, 48)}”</span>}
        {hit && <Badge tone="warn">Changed</Badge>}
        {item.count > 1 && <Badge>{item.count} places on this page</Badge>}
      </div>

      {notOnPage ? (
        <p className="mt-2 text-xs text-ttfc-muted">This change isn't used on the page in the preview{hit && hit.row.page ? <> (it's for {pageLabel(hit.row.page)})</> : null}. You can still edit or remove it.</p>
      ) : shown && !shown.visible ? (
        <Banner tone="warn" icon={EyeOff} className="mt-3" action={<Button size="sm" onClick={onBrowse}>Browse the page</Button>}>
          It's on this page but not showing right now (inside a menu, a pop-up, or only on the {`phone / computer`} layout). Switch to Browse, open it, then switch back.
        </Banner>
      ) : (
        <p className="mt-2 text-xs text-ttfc-muted">Outlined in pink on the page. The page changes as you type; visitors see nothing until it's published.</p>
      )}

      {!item.builtin && !hit ? (
        <div className="mt-3 rounded-[10px] border border-[#E3E0EE] bg-[#F6F5FA] p-3 text-[13px] leading-[19px] text-[#4A4566]">
          <p className="font-semibold">{isText ? "This text comes from your records, not from the site's built-in wording." : "This file comes from your records (an event's photo, a speaker's photo, a partner's logo…)."}</p>
          <p className="mt-1 break-words text-ttfc-text">{isText ? `“${clip(item.key, 300)}”` : item.key}</p>
          <p className="mt-2">Change it where it's kept, so the website, the app and emails all stay the same:</p>
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {RECORD_PAGES.map(([to, label]) => <Link key={to} to={`/admin/${to}`} className="font-semibold text-ttfc-pink hover:underline">{label}</Link>)}
          </p>
        </div>
      ) : isText ? (
        <div className="mt-3 space-y-3">
          <Field label="What the website should say" hint={hit ? "Clear the box (or press Back to built-in) to use the built-in wording again." : "Leave empty to keep the built-in wording."}>
            {(id) => (
              <Textarea id={id} rows={Math.min(8, Math.max(2, Math.ceil(item.key.length / 60)))} maxLength={4000} disabled={disabled}
                value={hit ? hit.row.text : ""} placeholder={item.key}
                onChange={(e) => change(e.target.value ? { text: e.target.value } : null)} />
            )}
          </Field>
          <p className="text-xs text-ttfc-muted"><span className="font-semibold">Built-in wording:</span> “{clip(item.key, 400)}”</p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[["Built in", item.key], ["Showing now", hit ? hit.row.url : item.key]].map(([label, src]) => (
              <figure key={label} className="min-w-0">
                <div className="flex h-28 items-center justify-center overflow-hidden rounded-[9px] border border-[#E3E0EE] bg-[repeating-conic-gradient(#F3F1F8_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
                  {item.type === "video" || /\.(mp4|webm|mov)$/i.test(src)
                    ? <video src={absolute(src)} muted playsInline preload="metadata" className="max-h-full max-w-full" />
                    : <img src={absolute(src)} alt="" className="max-h-full max-w-full object-contain" />}
                </div>
                <figcaption className="mt-1 truncate text-[11px] text-ttfc-muted" title={src}>{label}: {src.split("/").pop()}</figcaption>
              </figure>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => upload(e.target.files && e.target.files[0])} />
            {item.type !== "video" && <Button icon={Upload} loading={busy} disabled={disabled} onClick={() => fileRef.current && fileRef.current.click()}>Upload a picture</Button>}
            <span className="text-xs text-ttfc-muted">{item.type === "video" ? "Paste the new video's link:" : "or paste a link (animated GIFs keep moving this way):"}</span>
          </div>
          <form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            const u = link.trim();
            if (!isHttps(u)) { toast.error("Use a full address starting with https://"); return; }
            change({ url: u, ...(hit && hit.row.alt ? { alt: hit.row.alt } : {}) }); setLink("");
          }}>
            <Input type="url" inputMode="url" value={link} disabled={disabled} onChange={(e) => setLink(e.target.value)} placeholder={item.type === "video" ? "https://… .mp4" : "https://… .jpg, .png, .webp or .gif"} aria-label="Link to the new file" />
            <Button type="submit" disabled={disabled || !link.trim()}>Use this link</Button>
          </form>
          {hit && item.type !== "video" && (
            <Field label="Describe the picture (for screen readers)" hint="Optional. Leave empty to keep the built-in description.">
              {(id) => <Input id={id} maxLength={300} value={hit.row.alt || ""} disabled={disabled} onChange={(e) => change({ url: hit.row.url, ...(e.target.value ? { alt: e.target.value } : {}) })} />}
            </Field>
          )}
        </div>
      )}

      {(item.builtin || hit) && (
        <div className="mt-4 space-y-3">
          {hit && !notOnPage && <ScopeChoice scope={scope} page={page} count={item.count} onChange={moveScope} />}
          {hit && <Button size="sm" variant="ghost" icon={RotateCcw} disabled={disabled} onClick={reset}>Back to built-in</Button>}
        </div>
      )}
    </Card>
  );
}

function ItemRow({ item, active, changed, onPick }) {
  const isText = item.kind === "text";
  return (
    <li>
      <button type="button" onClick={onPick} aria-current={active ? "true" : undefined} data-copy-row={item.id}
        className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition ${active ? "bg-[#FDF2F8]" : "hover:bg-[#F6F5FA]"} ${focusRing}`}>
        {isText
          ? <Type className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ttfc-muted" aria-hidden="true" />
          : <img src={absolute(item.now || item.key)} alt="" loading="lazy" className="mt-0.5 h-8 w-10 shrink-0 rounded border border-[#E3E0EE] bg-white object-cover" />}
        <span className="min-w-0 flex-1">
          <span className={`block text-[13px] leading-[18px] ${item.builtin || changed ? "text-ttfc-text" : "text-ttfc-muted"} ${isText ? "line-clamp-2" : "truncate"}`}>
            {isText ? (changed ? item.shown : item.key) : item.key.split("/").pop()}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ttfc-dim">
            <span>{item.role}</span>
            {item.count > 1 && <span>× {item.count}</span>}
            {!item.visible && item.count > 0 && <span className="inline-flex items-center gap-0.5"><EyeOff className="h-3 w-3" aria-hidden="true" />hidden now</span>}
            {!item.builtin && !changed && <span>from records</span>}
            {!item.count && <span>not on this page</span>}
          </span>
        </span>
        {changed && <Badge tone="warn" className="mt-0.5">Changed</Badge>}
      </button>
    </li>
  );
}

export default function SiteCopy() {
  const toast = useToast();
  const { configured } = useCmsStatus();
  const builtin = useBuiltin();

  /* ---- The saved list (unsent > staged > live) ---- */
  const [doc, setDoc] = useState(undefined);      // undefined: loading; null: none yet
  const [loadError, setLoadError] = useState(null);
  const [base, setBase] = useState({ texts: [], media: [] });
  const [texts, setTexts] = useState([]);
  const [media, setMedia] = useState([]);
  const now = useRef({ texts, media });
  now.current = { texts, media };

  const adopt = useCallback((d, sent) => {
    const server = { texts: plainRows(d && d.texts, "text"), media: plainRows(d && d.media, "media") };
    // Anything typed while the request was away goes back on top.
    const typedT = sent ? diffRows(sent.texts, now.current.texts) : {};
    const typedM = sent ? diffRows(sent.media, now.current.media) : {};
    setDoc(d || null); setBase(server);
    setTexts(applyDiff(server.texts, typedT)); setMedia(applyDiff(server.media, typedM));
  }, []);
  const load = useCallback(async () => {
    setLoadError(null);
    try { const list = await api.get("/cms/siteCopy?drafts=1"); adopt((Array.isArray(list) ? list : [])[0] || null); }
    catch (e) { setLoadError(e); setDoc(null); }
  }, [adopt]);
  useEffect(() => { load(); }, [load]);
  const serverOld = loadError && loadError.status === 404;

  const dirty = useMemo(() => Object.keys(diffRows(base.texts, texts)).length + Object.keys(diffRows(base.media, media)).length, [base, texts, media]);
  const [saving, setSaving] = useState(false);
  const save = useCallback(async ({ auto = false } = {}) => {
    const sent = now.current;
    const dT = diffRows(base.texts, sent.texts), dM = diffRows(base.media, sent.media);
    if (!Object.keys(dT).length && !Object.keys(dM).length) return false;
    if (!auto) setSaving(true);
    try {
      // On top of the newest saved list, so two people editing different pieces don't undo each other.
      const list = await api.get("/cms/siteCopy?drafts=1");
      const latest = (Array.isArray(list) ? list : [])[0] || null;
      const body = { texts: applyDiff(plainRows(latest && latest.texts, "text"), dT), media: applyDiff(plainRows(latest && latest.media, "media"), dM) };
      const out = latest ? await api.patch("/cms/siteCopy/siteCopy?draft=1", body) : await api.post("/cms/siteCopy?draft=1", body);
      adopt(out, sent);
      return true;
    } catch (e) {
      if (auto) throw e;
      toast.error(e); return false;
    } finally { if (!auto) setSaving(false); }
  }, [base, adopt, toast]);
  const auto = useAutosave({ value: doc === undefined ? "" : JSON.stringify([texts, media]), save, enabled: doc !== undefined && !serverOld });

  const [confirm, setConfirm] = useState(null);   // "stage" | "publish"
  // The dialog shows a failure itself and closes when this finishes.
  const move = async (step) => {
    if (dirty && !(await save())) throw new Error("Your changes couldn't be saved, so nothing was sent.");
    auto.markSaved();
    await api.post(`/cms/siteCopy/siteCopy/${step}`);
    toast.success(step === "stage" ? "Sent to staging. Check it on the staging site, then publish." : "Published. It's on the website within a minute.");
    await load();
  };

  /* ---- The preview frame ---- */
  const frame = useRef(null);
  const box = useRef(null);
  const [src, setSrc] = useState("/");
  const [device, setDevice] = useState("desktop");
  const [pick, setPick] = useState(true);
  const [catalog, setCatalog] = useState({ path: "/", items: [] });
  const [frameReady, setFrameReady] = useState(false);
  const [sel, setSel] = useState(null);           // item id
  const [shown, setShown] = useState(null);
  const [boxW, setBoxW] = useState(0);
  const page = catalog.path || pageKey(src);
  const [tab, setTab] = useState("text");         // text | media | changed
  const [q, setQ] = useState("");
  const [records, setRecords] = useState(false);
  const pickRef = useRef(pick); pickRef.current = pick;
  const selRef = useRef(sel); selRef.current = sel;

  const post = useCallback((type, extra) => {
    const w = frame.current && frame.current.contentWindow;
    if (w) w.postMessage({ type: MSG + type, ...(extra || {}) }, window.location.origin);
  }, []);
  const sendRules = useCallback(() => post("rules", { texts: now.current.texts, media: now.current.media }), [post]);

  useEffect(() => {
    const onMessage = (e) => {
      if (!frame.current || e.source !== frame.current.contentWindow || e.origin !== window.location.origin) return;
      const d = e.data || {};
      if (d.type === `${MSG}ready`) { setFrameReady(true); sendRules(); post("mode", { pick: pickRef.current }); if (selRef.current) { const [kind, key] = selRef.current.split("\n"); post("focus", { kind, key }); } }
      else if (d.type === `${MSG}catalog`) setCatalog({ path: d.path, items: d.items || [] });
      else if (d.type === `${MSG}pick`) { setSel(idOf(d.kind, d.key)); setTab(d.kind === "text" ? "text" : "media"); setQ(""); setRecords(true); }
      else if (d.type === `${MSG}shown`) setShown({ id: idOf(d.kind, d.key), found: d.found, visible: d.visible });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post, sendRules]);
  useEffect(() => { if (frameReady) sendRules(); }, [texts, media, frameReady, sendRules]);
  useEffect(() => { post("mode", { pick }); }, [pick, post]);
  useEffect(() => {
    setShown(null);
    if (!sel) { post("focus", {}); return; }
    const [kind, key] = sel.split("\n");
    post("focus", { kind, key });
  }, [sel, post, catalog.path]);
  useEffect(() => {
    if (!box.current || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [doc === undefined]);                                                                    // eslint-disable-line react-hooks/exhaustive-deps
  const openPage = (path) => { setFrameReady(false); setCatalog({ path: pageKey(path), items: [] }); setSel(null); setSrc(path); };

  /* ---- The list ---- */
  const items = useMemo(() => {
    const out = [];
    const on = new Set();
    for (const it of catalog.items) {
      const isText = it.kind === "text";
      const hit = rowFor(isText ? texts : media, it.key, page);
      const isBuiltin = isText ? !!builtin && builtin.has(hashText(it.key)) : it.key.startsWith("/");
      on.add(it.id);
      out.push({ ...it, builtin: isBuiltin, changed: !!hit, shown: hit ? (isText ? hit.row.text : hit.row.url) : it.key });
    }
    // Changes that aren't used on this page (other pages, or wording the site no longer has).
    const extra = (rows, kind) => rows.forEach((r) => {
      const id = idOf(kind, r.match);
      if (on.has(id) || (r.page && r.page === page && on.has(id))) return;
      if (out.some((x) => x.id === id)) return;
      out.push({ id, kind, key: r.match, count: 0, visible: false, role: kind === "text" ? "Text" : "Picture or video", section: r.page ? pageLabel(r.page) : "Everywhere", builtin: true, changed: true, shown: kind === "text" ? r.text : r.url, type: /\.(mp4|webm|mov)$/i.test(r.url || "") ? "video" : "image", now: r.url || "" });
    });
    extra(texts, "text"); extra(media, "media");
    return out;
  }, [catalog.items, texts, media, builtin, page]);

  const counts = useMemo(() => ({
    text: items.filter((i) => i.kind === "text" && i.count && i.builtin).length,
    media: items.filter((i) => i.kind === "media" && i.count && i.builtin).length,
    changed: texts.length + media.length,
    records: items.filter((i) => i.count && !i.builtin && !i.changed).length,
  }), [items, texts, media]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (tab === "changed") { if (!i.changed) return false; }
      else {
        if (!i.count || i.kind !== (tab === "text" ? "text" : "media")) return false;
        if (!records && !i.builtin && !i.changed) return false;
      }
      return !needle || i.key.toLowerCase().includes(needle) || String(i.shown || "").toLowerCase().includes(needle) || String(i.section || "").toLowerCase().includes(needle);
    });
  }, [items, tab, q, records]);
  const groups = useMemo(() => {
    const out = [];
    for (const it of visible) {
      const title = it.section || "Top of the page";
      const last = out[out.length - 1];
      if (last && last.title === title) last.items.push(it); else out.push({ title, items: [it] });
    }
    return out;
  }, [visible]);
  const listRef = useRef(null);
  const selected = sel ? items.find((i) => i.id === sel) || null : null;
  useEffect(() => {
    if (!sel) return;
    // Only the list scrolls to the chosen row: the page itself stays where it is.
    const list = listRef.current;
    const row = list && [...list.querySelectorAll("[data-copy-row]")].find((el) => el.getAttribute("data-copy-row") === sel);
    if (!row) return;
    const a = row.getBoundingClientRect(), b = list.getBoundingClientRect();
    if (a.top < b.top + 30 || a.bottom > b.bottom) list.scrollTop += a.top - b.top - b.height / 3;
  }, [sel, tab, records, q]);

  if (doc === undefined) return <LoadingState />;
  if (loadError && !serverOld) return <ErrorState error={loadError} onRetry={load} />;

  const scale = device === "desktop" && boxW ? Math.min(1, boxW / DESKTOP_W) : boxW && boxW < PHONE_W ? boxW / PHONE_W : 1;
  const frameW = device === "desktop" ? DESKTOP_W : PHONE_W;
  const boxH = "max(520px, calc(100vh - 250px))";
  const tabBtn = (key, label, n) => (
    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
      className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === key ? "bg-[#151035] text-white" : "bg-[#F1EFF7] text-[#4A4566] hover:bg-[#E7E4F1]"} ${focusRing}`}>
      {label} <span className="opacity-70">{n}</span>
    </button>
  );
  const seg = (on, onClick, Icon, label) => (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 px-3 text-xs font-semibold ${on ? "bg-[#D6308C] text-white" : "bg-white text-[#4A4566] hover:bg-[#F6F5FA]"} ${focusRing}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
    </button>
  );
  const known = SITE_PAGES.some((g) => g.items.some(([p]) => p === page));

  return (
    <div>
      <PageHeader
        title="Website text & media"
        description="Every piece of text, picture and video on the website. Pick a page, click the piece you want to change (in the list or on the page itself) and type: the page on the right changes as you type. Visitors see nothing until you send it to staging and publish."
        status={doc && <ChangeBadge doc={doc} />}
        actions={(
          <>
            <AutosaveNote auto={auto} />
            <Button onClick={() => save().then((ok) => { if (ok) { auto.markSaved(); toast.success("Saved. It isn't on the website yet."); } })} loading={saving} disabled={!dirty || serverOld}>Save</Button>
            <Button icon={Send} onClick={() => setConfirm("stage")} disabled={serverOld || (!dirty && !(doc && doc.hasDraft))}>Send to staging</Button>
            <Button variant="primary" onClick={() => setConfirm("publish")} disabled={serverOld || dirty > 0 || !(doc && doc.staged) || !!(doc && doc.hasDraft)} title={doc && doc.staged && !dirty && !doc.hasDraft ? "" : "Send your changes to staging first"}>Publish to live</Button>
          </>
        )}
      />
      <CmsBanners configured={configured} />
      {serverOld && (
        <Banner tone="warn" className="mb-4" title="You can try it, but it can't be saved yet">
          The server needs its latest update before changes here can be saved. The preview works: what you type shows on the page on the right, in this browser only.
        </Banner>
      )}
      {doc && doc.staged && !doc.hasDraft && !dirty && (
        <Banner tone="info" className="mb-4" action={<a href={stagingUrl(page)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-ttfc-pink hover:underline">Open the staging site <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}>
          Your changes are on staging. Check them there, then press Publish to live.
        </Banner>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
        {/* ---------- The list and the editor ---------- */}
        <div className="order-2 min-w-0 space-y-4 xl:order-1">
          {selected
            ? <ItemEditor key={selected.id} item={selected} page={page} texts={texts} media={media} setTexts={setTexts} setMedia={setMedia}
                shown={shown && shown.id === selected.id ? shown : null} onBrowse={() => setPick(false)} disabled={false} />
            : (
              <Card className="text-[13px] leading-[19px] text-ttfc-muted">
                <p className="flex items-center gap-2 font-semibold text-ttfc-text"><MousePointerClick className="h-4 w-4 text-ttfc-pink" aria-hidden="true" />Click anything on the page to change it</p>
                <p className="mt-1">Or choose it from the list below. The piece you choose is outlined in pink on the page, so you always see what you're changing.</p>
              </Card>
            )}

          <Card className="p-0 sm:p-0">
            <div className="space-y-2.5 border-b border-ttfc-line p-3">
              <div role="tablist" aria-label="What to list" className="flex flex-wrap gap-1.5">
                {tabBtn("text", "Text", counts.text)}
                {tabBtn("media", "Pictures & video", counts.media)}
                {tabBtn("changed", "All changes", counts.changed)}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-muted" aria-hidden="true" />
                <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "changed" ? "Search every change" : `Search this page's ${tab === "text" ? "text" : "pictures"}`} aria-label="Search" className="pl-9" />
              </div>
              {tab !== "changed" && (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ttfc-muted">
                  <input type="checkbox" className="accent-[#D6308C]" checked={records} onChange={(e) => setRecords(e.target.checked)} />
                  Also list what comes from records ({counts.records}): event details, speakers, partners, prices
                </label>
              )}
            </div>
            <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
              {!frameReady && tab !== "changed" ? <LoadingState label="Reading the page…" className="py-8" />
                : !groups.length ? <p className="p-4 text-sm text-ttfc-muted">{tab === "changed" ? "Nothing has been changed yet. The website shows its built-in wording and pictures." : q ? "Nothing on this page matches." : "Nothing to list on this page."}</p>
                : groups.map((g, gi) => (
                  <section key={`${g.title}-${gi}`}>
                    <h3 className="sticky top-0 z-[1] truncate border-b border-ttfc-line bg-[#FAF9FC] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ttfc-muted">{g.title}</h3>
                    <ul className="divide-y divide-ttfc-line">
                      {g.items.map((it) => <ItemRow key={it.id} item={it} active={it.id === sel} changed={it.changed} onPick={() => setSel(it.id)} />)}
                    </ul>
                  </section>
                ))}
            </div>
          </Card>
        </div>

        {/* ---------- The page ---------- */}
        <div className="order-1 min-w-0 xl:sticky xl:top-4 xl:order-2 xl:self-start">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Select value={known ? page : "__other"} onChange={(e) => { if (e.target.value !== "__other") openPage(e.target.value); }} aria-label="Page to edit" className="min-w-0 max-w-[280px] flex-1">
              {!known && <option value="__other">{page}</option>}
              {SITE_PAGES.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(([p, label]) => <option key={p} value={p}>{label}</option>)}
                </optgroup>
              ))}
            </Select>
            <div className="inline-flex overflow-hidden rounded-[9px] border border-[#E3E0EE]" role="group" aria-label="Clicking the page">
              {seg(pick, () => setPick(true), MousePointerClick, "Click to edit")}
              {seg(!pick, () => setPick(false), Hand, "Browse")}
            </div>
            <div className="inline-flex overflow-hidden rounded-[9px] border border-[#E3E0EE]" role="group" aria-label="Screen size">
              {seg(device === "desktop", () => setDevice("desktop"), Monitor, "Computer")}
              {seg(device === "phone", () => setDevice("phone"), Smartphone, "Phone")}
            </div>
            <a href={page} target="_blank" rel="noreferrer" className={`ml-auto inline-flex items-center gap-1 rounded-md text-xs font-semibold text-ttfc-muted hover:text-ttfc-text ${focusRing}`}>Open page <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
          </div>
          <div ref={box} className="relative overflow-hidden rounded-[12px] border border-[#E3E0EE] bg-[#EFEDF5]" style={{ height: boxH }}>
            <iframe
              ref={frame} name={EDIT_FRAME} title="The website page being edited" src={src}
              style={{
                position: "absolute", top: 0, left: device === "desktop" ? 0 : `calc(50% - ${(frameW * scale) / 2}px)`,
                width: frameW, height: `calc(${boxH} / ${scale})`, border: 0, background: "#fff",
                transform: `scale(${scale})`, transformOrigin: "top left",
              }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ttfc-muted">
            {pick
              ? "Click to edit: clicking a piece of the page chooses it. Links and buttons don't work in this mode."
              : "Browse: the page works as usual, so you can open menus, pop-ups, the ticket panel or another page. Switch back to Click to edit when what you want is showing."}
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => move(confirm)} tone="default"
        title={confirm === "publish" ? "Publish to the live website?" : "Send to staging?"}
        confirmLabel={confirm === "publish" ? "Publish to live" : "Send to staging"}
        body={confirm === "publish"
          ? "Every text and media change that's on staging goes on thetechfestival.com, for all visitors, within about a minute."
          : `${dirty ? "Your changes are saved, then all" : "All"} saved text and media changes show on the staging site for review. The live website doesn't change.`}
      />
    </div>
  );
}
