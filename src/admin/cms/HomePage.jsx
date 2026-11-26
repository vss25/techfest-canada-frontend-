import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ExternalLink, Film, Lock, Send, Trash2, Type, UploadCloud, X } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Button, Card, ConfirmDialog, ErrorState, Field, Input, LoadingState, PageHeader, Select, Switch, Textarea } from "../ui";
import { useAdmin } from "../adminContext";
import { useApi } from "../hooks";
import { ImagePicker } from "./CmsParts";
import { uploadRaw } from "./uploadFile";
import { heroVideoSrc } from "../../lib/siteFiles";
import { useAdminEvent } from "../eventContext";
import { CmsBanners } from "./CmsParts";
import { ChangeBadge, PublishFlow } from "./workflow";
import { stagingUrl } from "./workflowState";
import useCmsStatus from "./useCmsStatus";
import { useAutosave } from "./useAutosave";
import { AutosaveNote } from "./AutosaveNote";
import { HOME_SECTION_LABELS, editorRows } from "../../lib/homeLayout";

/* =========================================================
   Admin › Website › Home page (Nov 25 2026). The owner: "there's no way to edit the home page specifically in
   the admin panel… what if I want to edit some elements or sections of the home page?"

   By default the home page follows the next event. Here staff pin another event to the top of the page and
   show, hide and reorder the sections under it. Wording and pictures are changed in Website text & media,
   like everywhere else on the site. One "homePage" document (backend services/cmsSchema.js), saved as a
   draft, sent to staging, then published like every other content change. The website reads it in
   src/redesign/approved/LiveSite.jsx (src/lib/homeLayout.js has the rules).
========================================================= */

const HINTS = {
  season: "Every 2027 event on a timeline, the next one highlighted.",
  next: "The next event: its photo, date and theme, with Get tickets.",
  speakers: "Four speakers (the event's own, else Toronto 2026's), with See all speakers.",
  agenda: "Sessions from the event at the top of the page, with See the full agenda.",
  highlights: "Toronto 2026 in numbers and photos, with the post-show report.",
  partners: "Partner logos (the event's own, else Toronto 2026's), with All partners.",
  form: "Name and email for the 2027 brochure and the Toronto 2026 report.",
};
const today = () => new Date().toISOString().slice(0, 10);
const SEASON = [/vancouver/i, /montr/i, /calgary/i, /toronto briefing/i, /ottawa/i, /toronto main/i];
const seasonRank = (e) => { const i = SEASON.findIndex((re) => re.test(e.name || "")); return i < 0 ? SEASON.length : i; };
const refOf = (v) => (v && typeof v === "object" ? v._ref : v) || "";
/* Nov 25 2026 (the owner: "still no admin panel update to update the home page separately from the most recent
   event"): the top of the page can have its own small line, headline, line under it, picture and video, and Who's
   on stage can show up to six speakers picked here. Every one is optional: empty = it follows the event. */
export const HOME_SPEAKERS_MAX = 6;
export const HOME_PHOTOS_MAX = 24;
/* A picture's address from its Sanity id ("image-<id>-<w>x<h>-<ext>"), for the thumbnails in this editor. */
const photoUrl = (asset, w = 480) => {
  const m = /^image-([A-Za-z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/.exec(String(asset || ""));
  return m ? `https://cdn.sanity.io/images/021qtoci/production/${m[1]}-${m[2]}.${m[3]}?w=${w}&auto=format` : "";
};
const plain = (d) => ({
  heroEvent: refOf(d && d.heroEvent), sections: editorRows(d && d.sections),
  heroEyebrow: (d && d.heroEyebrow) || "", heroHeadline: (d && d.heroHeadline) || "", heroText: (d && d.heroText) || "",
  heroImage: (d && d.heroImage && d.heroImage.asset && d.heroImage.asset._ref) || "", heroImageUrl: (d && d.heroImageUrl) || "",
  heroVideoUrl: (d && d.heroVideoUrl) || "",
  featuredSpeakers: ((d && d.featuredSpeakers) || []).map(refOf).filter(Boolean),
  // Last year's highlight pictures and how many of them the home page shows ("" = the usual 5).
  highlightPhotos: ((d && d.highlightPhotos) || []).map((ph) => ({ asset: (ph && ph.asset && ph.asset._ref) || "", alt: (ph && ph.alt) || "" })).filter((ph) => ph.asset),
  highlightCount: d && Number.isFinite(d.highlightCount) ? String(d.highlightCount) : "",
});
// What is sent: empty text and removed media are cleared (null), the picture goes as its asset id.
const toBody = (f) => ({
  heroEvent: f.heroEvent || null, sections: f.sections,
  heroEyebrow: f.heroEyebrow.trim() || null, heroHeadline: f.heroHeadline.trim() || null, heroText: f.heroText.trim() || null,
  heroImage: f.heroImage || null, heroVideoUrl: f.heroVideoUrl || null,
  featuredSpeakers: f.featuredSpeakers,
  highlightPhotos: f.highlightPhotos.map((ph) => ({ asset: ph.asset, alt: ph.alt.trim() })),
  highlightCount: f.highlightCount === "" ? null : Number(f.highlightCount),
});

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

  const adopt = useCallback((d) => {
    const p = plain(d);
    // A picture uploaded in this visit keeps its preview until the list sends its address back.
    setForm((cur) => { if (cur.heroImage && cur.heroImage === p.heroImage && !p.heroImageUrl) p.heroImageUrl = cur.heroImageUrl; return p; });
    setDoc(d || null); setBase(p);
  }, []);
  const { isManagement } = useAdmin();
  const speakerList = useApi("/cms/speaker?drafts=1");
  const allSpeakers = useMemo(() => (Array.isArray(speakerList.data) ? speakerList.data : []).filter((x) => x && x._id && x.name && !String(x._id).startsWith("drafts.")), [speakerList.data]);
  const [spkQuery, setSpkQuery] = useState("");
  const [videoBusy, setVideoBusy] = useState(null);
  const [videoErr, setVideoErr] = useState("");
  const videoInput = useRef(null);
  const pickVideo = async (file) => {
    if (!file) return;
    setVideoErr("");
    if (file.type !== "video/mp4") { setVideoErr("Choose an MP4 video."); return; }
    if (file.size > 40 * 1024 * 1024) { setVideoErr("That video is over 40 MB. Use a shorter or smaller one."); return; }
    setVideoBusy(0);
    try { const out = await uploadRaw(file, (p) => setVideoBusy(p)); setForm((f) => ({ ...f, heroVideoUrl: out.url })); toast.success("Video uploaded. Remember to save."); }
    catch (e) { setVideoErr(e.message); toast.error(e); }
    finally { setVideoBusy(null); if (videoInput.current) videoInput.current.value = ""; }
  };
  const toggleSpeaker = (id) => setForm((f) => {
    const has = f.featuredSpeakers.includes(id);
    if (!has && f.featuredSpeakers.length >= HOME_SPEAKERS_MAX) return f;
    return { ...f, featuredSpeakers: has ? f.featuredSpeakers.filter((x) => x !== id) : [...f.featuredSpeakers, id] };
  });
  const movePhoto = (i, by) => setForm((f) => {
    const list = f.highlightPhotos.slice(); const j = i + by;
    if (j < 0 || j >= list.length) return f;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...f, highlightPhotos: list };
  });
  // How many of the pictures the home page shows: the chosen number, else 5, never more than there are.
  const shownOnHome = Math.min(form.highlightPhotos.length, form.highlightCount === "" ? 5 : Number(form.highlightCount) || 0);
  const moveSpeaker = (i, by) => setForm((f) => {
    const list = f.featuredSpeakers.slice(); const j = i + by;
    if (j < 0 || j >= list.length) return f;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...f, featuredSpeakers: list };
  });
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
      const body = toBody(sent);
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
        description="One home page for the whole site: its headline, picture and video, the speakers to highlight, and the sections under it. Nothing reaches visitors until you send it to staging and publish."
        status={doc && <ChangeBadge doc={doc} />}
        actions={(
          <PublishFlow dirty={dirty} hasDraft={!!(doc && doc.hasDraft)} staged={!!(doc && doc.staged)} busy={saving ? "save" : ""} disabled={readOnly} stagingHref={stagingUrl("/")}
            onSave={() => save().then((ok) => { if (ok) { auto.markSaved(); toast.success("Saved. It isn't on the website yet."); } })}
            onStage={() => setConfirm("stage")} onPublish={() => setConfirm("publish")}>
            <AutosaveNote auto={auto} />
          </PublishFlow>
        )}
      />
      <CmsBanners configured={configured} />

      <div className="max-w-2xl space-y-5">
        <Card>
          <h2 className="text-base font-semibold">Top of the page</h2>
          <p className="mb-4 mt-1 text-sm text-ttfc-muted">The home page's headline, picture and video. There is one home page for the whole site: any box you leave empty is filled from the event chosen at the bottom of this card.</p>
          <div className="space-y-4">
            <Field label="Small line above the headline" hint={`${form.heroEyebrow.length}/120. Empty = that event's date, city and theme.`}>
              {(id) => <Input id={id} value={form.heroEyebrow} maxLength={120} disabled={readOnly} onChange={(e) => setForm((f) => ({ ...f, heroEyebrow: e.target.value }))} placeholder="2027 season · 6 events" />}
            </Field>
            <Field label="Headline" hint={`${form.heroHeadline.length}/160. Empty = the event's name.`}>
              {(id) => <Input id={id} value={form.heroHeadline} maxLength={160} disabled={readOnly} onChange={(e) => setForm((f) => ({ ...f, heroHeadline: e.target.value }))} placeholder="Where Canada's tech gets built" />}
            </Field>
            <Field label="Line under the headline" hint={`${form.heroText.length}/400. Empty = the event's one-line description.`}>
              {(id) => <Textarea id={id} rows={2} value={form.heroText} maxLength={400} disabled={readOnly} onChange={(e) => setForm((f) => ({ ...f, heroText: e.target.value }))} placeholder="Five city briefings, then the flagship event in Toronto." />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <ImagePicker label="Picture" kind="photo" aspect="aspect-[16/9]" url={form.heroImageUrl} disabled={readOnly}
                  onUploaded={({ assetId, url, preview }) => setForm((f) => ({ ...f, heroImage: assetId, heroImageUrl: url || preview }))} />
                {form.heroImage
                  ? <Button size="sm" variant="ghost" icon={Trash2} disabled={readOnly} onClick={() => setForm((f) => ({ ...f, heroImage: "", heroImageUrl: "" }))}>Remove picture</Button>
                  : <p className="text-xs text-ttfc-dim">Empty = the event's city photo.</p>}
              </div>
              <div className="space-y-2">
                <span className="block text-[13px] font-semibold text-ttfc-text/90">Video</span>
                <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border border-dashed border-ttfc-line bg-ttfc-ink/40">
                  {heroVideoSrc(form.heroVideoUrl)
                    ? <video key={form.heroVideoUrl} src={form.heroVideoUrl} muted loop autoPlay playsInline preload="metadata" aria-label="Home page video preview" className="h-full w-full object-cover" />
                    : <div className="flex flex-col items-center gap-2 px-4 text-center text-sm text-ttfc-muted"><Film className="h-7 w-7" aria-hidden="true" /><span>{videoBusy !== null ? `Uploading… ${Math.round(videoBusy * 100)}%` : "No video of its own"}</span></div>}
                </div>
                <input ref={videoInput} type="file" accept="video/mp4" className="sr-only" aria-label="Upload a home page video" disabled={readOnly || !isManagement || videoBusy !== null} onChange={(e) => pickVideo(e.target.files?.[0])} />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" icon={UploadCloud} disabled={readOnly || !isManagement || videoBusy !== null} onClick={() => videoInput.current?.click()}>
                    {videoBusy !== null ? `Uploading… ${Math.round(videoBusy * 100)}%` : form.heroVideoUrl ? "Replace video" : "Upload MP4"}
                  </Button>
                  {form.heroVideoUrl && <Button size="sm" variant="ghost" icon={Trash2} disabled={readOnly} onClick={() => setForm((f) => ({ ...f, heroVideoUrl: "" }))}>Remove</Button>}
                </div>
                {!isManagement && !readOnly && <p className="flex items-center gap-1.5 text-xs text-ttfc-muted"><Lock className="h-3 w-3" aria-hidden="true" /> Only management can upload videos.</p>}
                {videoErr && <p role="alert" className="text-xs text-red-300">{videoErr}</p>}
                <p className="text-xs text-ttfc-dim">MP4, up to 40 MB, plays silently on a loop. Empty = the event's video.</p>
              </div>
            </div>
          </div>
          <div className="mt-5 border-t border-ttfc-line pt-4">
          <Field label="Empty boxes are filled from" hint={form.heroEvent ? "Pinned: it stays on this event until you change it back to the next event." : "Moves on to the following event by itself once one is over."}>
            <Select value={form.heroEvent} onChange={(e) => setForm((f) => ({ ...f, heroEvent: e.target.value }))} disabled={readOnly}>
              <option value="">{next ? `The next event (now ${next.name})` : "The next event"}</option>
              {upcoming.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              {pinned && !upcoming.includes(pinned) && <option value={pinned._id}>{pinned.name} (over)</option>}
            </Select>
          </Field>
          {pinnedGone && <Banner tone="warn" className="mt-3">This event is over. Pick the next event so the home page keeps selling tickets.</Banner>}
          {form.heroEvent && !pinned && events.length > 0 && <Banner tone="warn" className="mt-3">The pinned event can't be found any more, so the home page shows the next event.</Banner>}
            <p className="mt-3 text-xs text-ttfc-muted">
              For other wording on the page, use{" "}
              <Link to="/admin/content/site-copy" className="inline-flex items-center gap-1 font-semibold text-ttfc-pink hover:underline"><Type className="h-3.5 w-3.5" aria-hidden="true" />Website text & media</Link>.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold">Speakers to highlight</h2>
          <p className="mb-4 mt-1 text-sm text-ttfc-muted">Pick up to {HOME_SPEAKERS_MAX} speakers to highlight on the home page, in the order you want. Pick none and it shows the event's own speakers (or last year's until three are confirmed).</p>
          {form.featuredSpeakers.length > 0 && (
            <ol className="mb-4 divide-y divide-ttfc-line rounded-xl border border-ttfc-line">
              {form.featuredSpeakers.map((id, i) => {
                const sp = allSpeakers.find((x) => x._id === id);
                return (
                  <li key={id} className="flex items-center gap-3 px-3 py-2">
                    <span className="w-5 text-center text-xs font-semibold text-ttfc-muted">{i + 1}</span>
                    {sp && sp.imageUrl ? <img src={`${sp.imageUrl}?w=64&h=64&fit=crop`} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <span className="h-8 w-8 shrink-0 rounded-full bg-ttfc-ink/40" aria-hidden="true" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{sp ? sp.name : "Speaker no longer listed"}</span>
                    <Button size="sm" variant="ghost" icon={ArrowUp} disabled={readOnly || i === 0} onClick={() => moveSpeaker(i, -1)} aria-label={`Move ${sp ? sp.name : "speaker"} up`} />
                    <Button size="sm" variant="ghost" icon={ArrowDown} disabled={readOnly || i === form.featuredSpeakers.length - 1} onClick={() => moveSpeaker(i, 1)} aria-label={`Move ${sp ? sp.name : "speaker"} down`} />
                    <Button size="sm" variant="ghost" icon={X} disabled={readOnly} onClick={() => toggleSpeaker(id)} aria-label={`Remove ${sp ? sp.name : "speaker"}`} />
                  </li>
                );
              })}
            </ol>
          )}
          <Field label="Add a speaker" hint={form.featuredSpeakers.length >= HOME_SPEAKERS_MAX ? `That's the most the section shows (${HOME_SPEAKERS_MAX}). Remove one to add another.` : `${form.featuredSpeakers.length} of ${HOME_SPEAKERS_MAX} picked. Type a name to search.`}>
            {(id) => <Input id={id} type="search" value={spkQuery} onChange={(e) => setSpkQuery(e.target.value)} placeholder="Search speakers by name or organisation" disabled={readOnly} />}
          </Field>
          {spkQuery.trim().length >= 2 && (
            <ul className="mt-2 max-h-64 divide-y divide-ttfc-line overflow-y-auto rounded-xl border border-ttfc-line">
              {allSpeakers.filter((x) => !form.featuredSpeakers.includes(x._id) && `${x.name} ${x.company || ""} ${x.title || ""}`.toLowerCase().includes(spkQuery.trim().toLowerCase())).slice(0, 12).map((x) => (
                <li key={x._id}>
                  <button type="button" disabled={readOnly || form.featuredSpeakers.length >= HOME_SPEAKERS_MAX} onClick={() => { toggleSpeaker(x._id); setSpkQuery(""); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ttfc-contrast/5 disabled:cursor-not-allowed disabled:opacity-50">
                    {x.imageUrl ? <img src={`${x.imageUrl}?w=64&h=64&fit=crop`} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <span className="h-8 w-8 shrink-0 rounded-full bg-ttfc-ink/40" aria-hidden="true" />}
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{x.name}</span><span className="block truncate text-xs text-ttfc-muted">{[x.title, x.company].filter(Boolean).join(", ")}</span></span>
                  </button>
                </li>
              ))}
              {allSpeakers.length === 0 && <li className="px-3 py-2 text-sm text-ttfc-muted">{speakerList.loading ? "Loading speakers…" : "No speakers found."}</li>}
            </ul>
          )}
        </Card>

        {/* Nov 26 2026 (the owner: "Where do I add images for last year highlights on home page? I want the
            flexibility in how many images I want to show in home page before I take them to the gallery"). */}
        <Card>
          <h2 className="text-base font-semibold">Last year&apos;s highlights: pictures</h2>
          <p className="mb-4 mt-1 text-sm text-ttfc-muted">
            The pictures in the home page&apos;s Toronto 2026 highlights section and in the gallery it links to. Upload as many as {HOME_PHOTOS_MAX}, put them in order,
            and choose how many the home page shows; the gallery shows them all. With none here, the website uses its built-in set.
          </p>
          {form.highlightPhotos.length > 0 && (
            <ol className="mb-4 grid gap-3 sm:grid-cols-2">
              {form.highlightPhotos.map((ph, i) => {
                const onHome = i < shownOnHome;
                return (
                  <li key={ph.asset} className={`flex gap-3 rounded-xl border p-2.5 ${onHome ? "border-[#D6308C] bg-[#FDF2F8]" : "border-ttfc-line"}`}>
                    <img src={photoUrl(ph.asset)} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" loading="lazy" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ttfc-muted">{i + 1} · {onHome ? "On the home page" : "Gallery only"}</span>
                      <Input aria-label={`Description of picture ${i + 1}`} value={ph.alt} maxLength={200} disabled={readOnly} placeholder="Describe the picture (for screen readers)"
                        onChange={(e) => setForm((f) => ({ ...f, highlightPhotos: f.highlightPhotos.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)) }))} />
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" icon={ArrowUp} disabled={readOnly || i === 0} onClick={() => movePhoto(i, -1)} aria-label={`Move picture ${i + 1} earlier`} />
                        <Button size="sm" variant="ghost" icon={ArrowDown} disabled={readOnly || i === form.highlightPhotos.length - 1} onClick={() => movePhoto(i, 1)} aria-label={`Move picture ${i + 1} later`} />
                        <Button size="sm" variant="ghost" icon={Trash2} disabled={readOnly} onClick={() => setForm((f) => ({ ...f, highlightPhotos: f.highlightPhotos.filter((_, j) => j !== i) }))}>Remove</Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              {form.highlightPhotos.length < HOME_PHOTOS_MAX ? (
                <ImagePicker key={form.highlightPhotos.length} label="Add a picture" kind="photo" aspect="aspect-[16/9]" url="" disabled={readOnly}
                  onUploaded={({ assetId }) => { if (assetId) setForm((f) => (f.highlightPhotos.some((x) => x.asset === assetId) ? f : { ...f, highlightPhotos: [...f.highlightPhotos, { asset: assetId, alt: "" }] })); }} />
              ) : <p className="text-sm text-ttfc-muted">That&apos;s the most pictures ({HOME_PHOTOS_MAX}). Remove one to add another.</p>}
            </div>
            <Field label="How many show on the home page" hint={form.highlightPhotos.length ? `The first ${shownOnHome} of ${form.highlightPhotos.length} show on the home page; the rest are in the gallery. Five gives the designed mosaic (one large, four small).` : "Add pictures first."}>
              {(id) => (
                <Select id={id} value={String(shownOnHome)} disabled={readOnly || !form.highlightPhotos.length}
                  onChange={(e) => setForm((f) => ({ ...f, highlightCount: e.target.value }))}>
                  {Array.from({ length: form.highlightPhotos.length + 1 }, (_, n) => <option key={n} value={n}>{n === 0 ? "None (gallery only)" : n}</option>)}
                </Select>
              )}
            </Field>
          </div>
        </Card>

        <Card className="p-0 sm:p-0">
          <div className="p-5 pb-3 sm:p-6 sm:pb-3">
            <h2 className="text-base font-semibold">Sections on the page</h2>
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
          Now: empty boxes at the top are filled from {pinned && !pinnedGone ? pinned.name : next ? next.name : "the next event"}
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
