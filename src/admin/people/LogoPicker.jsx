import { useId, useState } from "react";
import { Globe, ImagePlus, Link2, Search, Upload } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, EmptyState, Field, Input, LoadingState, Modal } from "../ui";
import { prepareImage } from "../cms/imageUpload";
import { companyInitials } from "./peopleMeta";

/* =========================================================
   Company logo: find one on the internet and make it the
   company's default (everyone at that company shows it), or
   this person's own. POST /console/companies/logo re-hosts it
   (Cloudinary, Sanity or our database), so we never hotlink.
   Candidates come from GET /console/companies/candidates: our
   own logos first (the current default, website partners and
   sponsors), then the company's site, Google, DuckDuckGo and
   Wikimedia Commons. Previews are sent as data URLs, so the
   browser never loads third-party images.
========================================================= */

/** A company's logo on a light tile (most logos are dark on transparent), or its initials. */
export function CompanyMark({ url, name, size = "md", className = "" }) {
  const box = size === "lg" ? "h-16 w-16 rounded-2xl p-2 text-base" : size === "sm" ? "h-7 w-7 rounded-lg p-0.5 text-[10px]" : "h-10 w-10 rounded-xl p-1 text-xs";
  if (url) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ${box} ${className}`}>
        <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
      </span>
    );
  }
  return (
    <span className={`inline-flex shrink-0 items-center justify-center bg-white/5 font-bold text-ttfc-dim ${box} ${className}`} aria-hidden="true">
      {companyInitials(name)}
    </span>
  );
}

const SOURCE = {
  current: "Current default", cms: "Website partners", site: "Their website", google: "Google", duckduckgo: "DuckDuckGo", wikimedia: "Wikimedia Commons",
};
const STORE = { cloudinary: "Cloudinary", sanity: "Sanity", database: "our database", existing: "where it already was" };

function Candidate({ c, picked, onPick, name }) {
  const id = useId();
  const src = c.preview || c.url;
  return (
    <label htmlFor={id}
      className={`flex cursor-pointer flex-col gap-2 rounded-2xl border p-3 transition ${picked ? "border-ttfc-pink bg-ttfc-pink/10" : "border-ttfc-line bg-ttfc-panel2 hover:border-ttfc-purple/60"}`}>
      <input id={id} type="radio" name={name} className="sr-only" checked={picked} onChange={onPick} />
      <span className="flex h-24 items-center justify-center rounded-xl bg-white p-2">
        <img src={src} alt="" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
      </span>
      <span className="min-w-0 text-xs">
        <span className="block truncate font-semibold text-ttfc-text" title={c.label}>{c.label || SOURCE[c.source] || c.source}</span>
        <span className="block text-ttfc-dim">
          {SOURCE[c.source] || c.source}{c.width && c.height ? ` · ${c.width}×${c.height}` : ""}
        </span>
      </span>
    </label>
  );
}

/**
 * @param {object} p
 * @param {boolean} p.open
 * @param {string} p.company        company name (staff can change it here)
 * @param {string} [p.domain]       suggested website
 * @param {string} [p.personId]     the profile it was opened from
 * @param {string} [p.personName]
 * @param {boolean} [p.canOwn]      the person can have a logo of their own (has an account or a pass)
 * @param {number}  [p.maxBytes]    the largest file to upload (Attending organisations: 2 MB)
 * @param {string}  [p.orgKey]      the organisation's key (Attending organisations), so the logo lands on that entry
 *                                  even when staff edit the name
 */
export default function LogoPicker({ open, onClose, company = "", domain = "", personId = "", personName = "", canOwn = false, onSaved, maxBytes = 0, orgKey = "" }) {
  const toast = useToast();
  const [name, setName] = useState(company);
  const [site, setSite] = useState(domain);
  const [found, setFound] = useState(null); // { candidates, errors, domain, store }
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [picked, setPicked] = useState(null); // { kind: "candidate", c } | { kind: "url" } | { kind: "file", dataUrl, name }
  const [pasted, setPasted] = useState("");
  const [scope, setScope] = useState("company");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const radio = useId();

  const search = async () => {
    setSearching(true); setSearchError(""); setPicked(null);
    try {
      const qs = new URLSearchParams();
      if (name.trim()) qs.set("name", name.trim());
      if (site.trim()) qs.set("domain", site.trim());
      const r = await api.get(`/console/companies/candidates?${qs}`);
      setFound(r);
      if (r.domain && r.domain !== site.trim()) setSite(r.domain);
      if (r.candidates?.length) setPicked({ kind: "candidate", c: r.candidates[0] });
    } catch (err) {
      setSearchError(err?.message || "Couldn't search for logos");
    } finally { setSearching(false); }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (maxBytes && file.size > maxBytes) { toast.error(`That file is over ${Math.round(maxBytes / 1024 / 1024)} MB. Use a smaller PNG, JPG, SVG or WebP.`); return; }
    try {
      const { dataUrl } = await prepareImage(file, { kind: "logo" });
      setPicked({ kind: "file", dataUrl, name: file.name });
    } catch (err) { toast.error(err); }
  };

  const forPerson = scope === "person";
  const save = async () => {
    setSaving(true); setSaveError("");
    try {
      const body = { name: name.trim(), domain: site.trim(), personId: personId || undefined, forPerson, key: !forPerson && orgKey ? orgKey : undefined };
      if (picked?.kind === "candidate") Object.assign(body, { url: picked.c.url, source: picked.c.source });
      else if (picked?.kind === "url") Object.assign(body, { url: pasted.trim(), source: "url" });
      else if (picked?.kind === "file") Object.assign(body, { data: picked.dataUrl });
      const r = await api.post("/console/companies/logo", body);
      toast.success(forPerson ? `Logo saved for ${personName || "this person"} only` : `Logo saved as the default for everyone at ${name.trim()}`);
      onSaved?.(r);
      onClose();
    } catch (err) {
      setSaveError(err?.message || "Couldn't save the logo");
    } finally { setSaving(false); }
  };

  const ready = picked && (picked.kind !== "url" || /^https?:\/\/\S+$/i.test(pasted.trim())) && (forPerson || name.trim());
  const list = found?.candidates || [];

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      size="lg"
      title="Company logo"
      description="Find the logo on the company's website or a few public icon services, paste an image link, or upload a file. We keep our own copy."
      footer={<>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" icon={ImagePlus} loading={saving} disabled={!ready} onClick={save}>
          {forPerson ? "Use for this person" : "Set as company default"}
        </Button>
      </>}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Company">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={160} placeholder="Acme" />}</Field>
        <Field label="Website">{(id) => (
          <Input id={id} value={site} onChange={(e) => setSite(e.target.value)} maxLength={200} placeholder="acme.com" inputMode="url"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} />
        )}</Field>
        <Button icon={Search} loading={searching} disabled={!name.trim() && !site.trim()} onClick={search}>Find logos</Button>
      </div>
      <p className="mt-2 text-xs text-ttfc-dim">Check the website is the company's own before you search. Wikimedia is searched by the company name.</p>

      <div className="mt-5">
        {searching ? <LoadingState label="Looking on the internet…" className="py-10" /> : searchError ? (
          <Banner tone="danger" title="Couldn't search">{searchError}</Banner>
        ) : found && !list.length ? (
          <EmptyState icon={Globe} title="No logos found" body="Try the company's main website, paste an image link or upload a file." className="py-8" />
        ) : list.length ? (
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-ttfc-text/90">Pick one</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {list.map((c) => (
                <Candidate key={c.url} c={c} name={radio} picked={picked?.kind === "candidate" && picked.c.url === c.url}
                  onPick={() => setPicked({ kind: "candidate", c })} />
              ))}
            </div>
          </fieldset>
        ) : null}
        {found?.errors?.length > 0 && list.length > 0 && (
          <p className="mt-2 text-xs text-ttfc-dim">Some places didn't answer: {found.errors.length}.</p>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Or paste an image link" hint="A direct link to a PNG, JPEG, SVG, WebP, GIF or ICO file, 2 MB at most.">
          {(id) => (
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
              <Input id={id} value={pasted} className="pl-9" placeholder="https://…/logo.png" inputMode="url"
                onChange={(e) => { setPasted(e.target.value); setPicked(e.target.value.trim() ? { kind: "url" } : null); }} />
            </div>
          )}
        </Field>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-ttfc-line bg-ttfc-panel2 px-4 text-sm font-semibold text-ttfc-text transition hover:border-ttfc-purple/60 focus-within:ring-2 focus-within:ring-ttfc-purple">
          <Upload className="h-4 w-4" aria-hidden="true" /> Upload a file
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="sr-only" onChange={onFile} />
        </label>
      </div>
      {picked?.kind === "file" && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-ttfc-pink/40 bg-ttfc-pink/10 p-3 text-sm">
          <CompanyMark url={picked.dataUrl} name={name} />
          <span className="min-w-0 truncate">{picked.name}</span>
          <Badge tone="pink">Picked</Badge>
        </div>
      )}

      {canOwn && personId && (
        <fieldset className="mt-5 space-y-2 rounded-2xl border border-ttfc-line p-4 text-sm">
          <legend className="px-1 text-[13px] font-semibold text-ttfc-text/90">Use it for</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name={`${radio}-scope`} checked={scope === "company"} onChange={() => setScope("company")} className="mt-1 accent-ttfc-pink" />
            <span>Everyone at {name.trim() || "this company"} <span className="text-ttfc-dim">(the company's default)</span></span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name={`${radio}-scope`} checked={scope === "person"} onChange={() => setScope("person")} className="mt-1 accent-ttfc-pink" />
            <span>Only {personName || "this person"}</span>
          </label>
        </fieldset>
      )}
      {found?.store && <p className="mt-3 text-xs text-ttfc-dim">A logo you pick is copied to {STORE[found.store] || found.store}.</p>}
      {saveError && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{saveError}</p>}
    </Modal>
  );
}
