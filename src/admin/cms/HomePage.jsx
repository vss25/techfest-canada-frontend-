import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ExternalLink, Send, Type } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Button, Card, ConfirmDialog, ErrorState, Field, LoadingState, PageHeader, Select, Switch } from "../ui";
import { useAdminEvent } from "../eventContext";
import { CmsBanners } from "./CmsParts";
import { ChangeBadge } from "./workflow";
import { stagingUrl } from "./workflowState";
import useCmsStatus from "./useCmsStatus";
import { useAutosave } from "./useAutosave";
import { AutosaveNote } from "./AutosaveNote";
import { HOME_SECTION_LABELS, editorRows } from "../../lib/homeLayout";

/* =========================================================
   Admin › Content › Home page (Nov 25 2026). The owner: "there's no way to edit the home page specifically in
   the admin panel… what if I want to edit some elements or sections of the home page?"

   By default the home page follows the next event. Here staff pin another event to the top of the page and
   show, hide and reorder the sections under it. Wording and pictures are changed in Website text & media,
   like everywhere else on the site. One "homePage" document (backend services/cmsSchema.js), saved as a
   draft, sent to staging, then published like every other content change. The website reads it in
   src/redesign/approved/LiveSite.jsx (src/lib/homeLayout.js has the rules).
========================================================= */

const HINTS = {
  season: "Every 2027 event on a timeline, the next one highlighted.",
  agenda: "Sessions from the event at the top of the page, with See the full agenda.",
  highlights: "Toronto 2026 in numbers and photos, with the post-show report.",
  form: "Name and email for the 2027 brochure and the Toronto 2026 report.",
};
const today = () => new Date().toISOString().slice(0, 10);
const SEASON = [/vancouver/i, /montr/i, /calgary/i, /toronto briefing/i, /ottawa/i, /toronto main/i];
const seasonRank = (e) => { const i = SEASON.findIndex((re) => re.test(e.name || "")); return i < 0 ? SEASON.length : i; };
const refOf = (v) => (v && typeof v === "object" ? v._ref : v) || "";
const plain = (d) => ({ heroEvent: refOf(d && d.heroEvent), sections: editorRows(d && d.sections) });

export default function HomePage() {
  const toast = useToast();
  const { configured } = useCmsStatus();
  const readOnly = configured === false;
  const { events = [] } = useAdminEvent();

  const [doc, setDoc] = useState(undefined);      // undefined: loading; null: none yet
  const [loadError, setLoadError] = useState(null);
  const [base, setBase] = useState(plain(null));
  const [form, setForm] = useState(plain(null));
  const formRef = useRef(form);
  formRef.current = form;

  const adopt = useCallback((d) => { const p = plain(d); setDoc(d || null); setBase(p); setForm(p); }, []);
  const load = useCallback(async () => {
    setLoadError(null);
    try { const list = await api.get("/cms/homePage?drafts=1"); adopt((Array.isArray(list) ? list : [])[0] || null); }
    catch (e) { setLoadError(e); setDoc(null); }
  }, [adopt]);
  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(form) !== JSON.stringify(base);
  const [saving, setSaving] = useState(false);
  const save = useCallback(async ({ auto = false } = {}) => {
    const sent = formRef.current;
    if (JSON.stringify(sent) === JSON.stringify(base)) return false;
    if (!auto) setSaving(true);
    try {
      const body = { heroEvent: sent.heroEvent || null, sections: sent.sections };
      const list = await api.get("/cms/homePage?drafts=1");
      const latest = (Array.isArray(list) ? list : [])[0] || null;
      const out = latest ? await api.patch("/cms/homePage/homePage?draft=1", body) : await api.post("/cms/homePage?draft=1", body);
      adopt(out);
      return true;
    } catch (e) {
      if (auto) throw e;
      toast.error(e); return false;
    } finally { if (!auto) setSaving(false); }
  }, [base, adopt, toast]);
  const auto = useAutosave({ value: doc === undefined ? "" : JSON.stringify(form), save, enabled: doc !== undefined && !readOnly });

  const [confirm, setConfirm] = useState(null);   // "stage" | "publish"
  const move = async (step) => {
    if (dirty && !(await save())) throw new Error("Your changes couldn't be saved, so nothing was sent.");
    auto.markSaved();
    await api.post(`/cms/homePage/homePage/${step}`);
    toast.success(step === "stage" ? "Sent to staging. Check the home page there, then publish." : "Published. It's on the website within a minute.");
    await load();
  };

  // The 2027 events, in date order, for "Event at the top of the page".
  // Dated events by date; undated ones in the season's order (the website's next event is Vancouver until dates are set).
  const upcoming = useMemo(() => (events || [])
    .filter((e) => e && e._id && e.name && String(e.endDate || e.startDate || "9999") >= today())
    .sort((a, b) => String(a.startDate || "9").localeCompare(String(b.startDate || "9")) || seasonRank(a) - seasonRank(b)), [events]);
  const next = upcoming[0];
  const pinned = form.heroEvent ? (events || []).find((e) => e._id === form.heroEvent) : null;
  const pinnedGone = form.heroEvent && pinned && String(pinned.endDate || pinned.startDate || "9999") < today();

  const setSection = (i, patch) => setForm((f) => ({ ...f, sections: f.sections.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const moveSection = (i, by) => setForm((f) => {
    const list = f.sections.slice();
    const j = i + by;
    if (j < 0 || j >= list.length) return f;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...f, sections: list };
  });

  if (doc === undefined) return <LoadingState />;
  if (loadError && !doc && loadError.status !== 404) return <ErrorState error={loadError} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Home page"
        description="By default the home page follows the next event. Pin another event to the top, and show, hide or reorder the sections under it. Nothing reaches visitors until you send it to staging and publish."
        status={doc && <ChangeBadge doc={doc} />}
        actions={(
          <>
            <AutosaveNote auto={auto} />
            <Button onClick={() => save().then((ok) => { if (ok) { auto.markSaved(); toast.success("Saved. It isn't on the website yet."); } })} loading={saving} disabled={!dirty || readOnly}>Save</Button>
            <Button icon={Send} onClick={() => setConfirm("stage")} disabled={readOnly || (!dirty && !(doc && doc.hasDraft))}>Send to staging</Button>
            <Button variant="primary" onClick={() => setConfirm("publish")} disabled={readOnly || dirty || !(doc && doc.staged) || !!(doc && doc.hasDraft)} title={doc && doc.staged && !dirty && !doc.hasDraft ? "" : "Send your changes to staging first"}>Publish to live</Button>
          </>
        )}
      />
      <CmsBanners configured={configured} />
      {doc && doc.staged && !doc.hasDraft && !dirty && (
        <Banner tone="info" className="mb-4" action={<a href={stagingUrl("/")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-ttfc-pink hover:underline">Open the staging site <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}>
          Your changes are on staging. Check the home page there, then press Publish to live.
        </Banner>
      )}

      <div className="max-w-2xl space-y-5">
        <Card>
          <h2 className="text-base font-semibold">Top of the page</h2>
          <p className="mb-4 mt-1 text-sm text-ttfc-muted">The event the home page opens with: its name, date, photo and a link to its page.</p>
          <Field label="Event at the top of the page" hint={form.heroEvent ? "Pinned: it stays until you change it back to the next event." : "Moves on by itself once an event is over."}>
            <Select value={form.heroEvent} onChange={(e) => setForm((f) => ({ ...f, heroEvent: e.target.value }))} disabled={readOnly}>
              <option value="">{next ? `The next event (now ${next.name})` : "The next event"}</option>
              {upcoming.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              {pinned && !upcoming.includes(pinned) && <option value={pinned._id}>{pinned.name} (over)</option>}
            </Select>
          </Field>
          {pinnedGone && <Banner tone="warn" className="mt-3">This event is over. Pick the next event so the home page keeps selling tickets.</Banner>}
          {form.heroEvent && !pinned && events.length > 0 && <Banner tone="warn" className="mt-3">The pinned event can't be found any more, so the home page shows the next event.</Banner>}
          <p className="mt-3 text-xs text-ttfc-muted">
            Its photo or video and framing come from Event pages. To change the words on the home page, use{" "}
            <Link to="/admin/content/site-copy" className="inline-flex items-center gap-1 font-semibold text-ttfc-pink hover:underline"><Type className="h-3.5 w-3.5" aria-hidden="true" />Website text & media</Link>.
          </p>
        </Card>

        <Card className="p-0 sm:p-0">
          <div className="p-5 pb-3 sm:p-6 sm:pb-3">
            <h2 className="text-base font-semibold">Sections under it</h2>
            <p className="mt-1 text-sm text-ttfc-muted">Switch a section off to hide it. Use the arrows to change the order.</p>
          </div>
          <ol className="divide-y divide-ttfc-line border-t border-ttfc-line">
            {form.sections.map((r, i) => (
              <li key={r.key} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="ghost" icon={ArrowUp} onClick={() => moveSection(i, -1)} disabled={readOnly || i === 0} aria-label={`Move ${HOME_SECTION_LABELS[r.key]} up`} />
                  <Button size="sm" variant="ghost" icon={ArrowDown} onClick={() => moveSection(i, 1)} disabled={readOnly || i === form.sections.length - 1} aria-label={`Move ${HOME_SECTION_LABELS[r.key]} down`} />
                </div>
                <div className={`min-w-0 flex-1 ${r.on ? "" : "opacity-50"}`}>
                  <p className="text-sm font-semibold">{HOME_SECTION_LABELS[r.key]}</p>
                  <p className="text-xs text-ttfc-muted">{HINTS[r.key]}</p>
                </div>
                <Switch checked={r.on} onChange={(on) => setSection(i, { on })} disabled={readOnly} ariaLabel={`Show ${HOME_SECTION_LABELS[r.key]}`} />
              </li>
            ))}
          </ol>
        </Card>
        <p className="text-xs text-ttfc-muted">
          Now: the top of the page shows {pinned && !pinnedGone ? pinned.name : next ? next.name : "the next event"}
          {form.sections.some((r) => !r.on) ? `, and ${form.sections.filter((r) => !r.on).length} section${form.sections.filter((r) => !r.on).length === 1 ? " is" : "s are"} hidden` : ""}.
        </p>
      </div>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => move(confirm)} tone="default"
        title={confirm === "publish" ? "Publish the home page to the live website?" : "Send the home page to staging?"}
        confirmLabel={confirm === "publish" ? "Publish to live" : "Send to staging"}
        body={confirm === "publish"
          ? "The home page's event and sections go on thetechfestival.com, for all visitors, within about a minute."
          : `${dirty ? "Your changes are saved, then the" : "The"} home page's event and sections show on the staging site for review. The live website doesn't change.`}
      />
    </div>
  );
}
