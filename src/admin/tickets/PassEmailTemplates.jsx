import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Button, Drawer, ErrorState, LoadingState, Tabs } from "../ui";
import { when } from "../format";
import { listText, useLivePreview } from "./speakerEmailHooks";
import { ListField } from "./SpeakerEmailCompose";
import { EmailCopyEditor, EmailPreview } from "./EmailCopyEditor";
import { countSet, tidyCopy } from "./passEmailHooks";

/* =========================================================
   The pass emails' editors (Oct 19 2026: every word editable)
   ---------------------------------------------------------
   SpeakerTemplateDrawer  Admin → Speaker passes → Edit email:
                          every Speaker Pass email (+ the cc list);
   SpeakerWording         one speaker's own wording, inside their
                          preview (Speaker passes → a speaker);
   PassTemplateDrawer     Issue passes / Exhibitor passes → Edit
                          email: every pass of that kind, with the
                          pass name, what's included, the access
                          line and the RSVP reason per pass type.
   One pass's wording beats the template, which beats the built-in
   text. Each has a live preview of the real email (the server's
   builder; previews never send). Saving is management only and
   audited by the server.
   Backend: /console/speaker-passes/template, /preview-sample,
   /:id/copy, /:id/preview; /console/{issued,exhibitor}-passes/email,
   /email/preview.
========================================================= */

const SPEAKERS = "/console/speaker-passes";

/** Edit email for Speaker Passes: the whole template and the cc list, with a sample speaker's email. */
export function SpeakerTemplateDrawer({ canEdit, onClose, onSaved }) {
  const toast = useToast();
  const [loaded, setLoaded] = useState(null); // GET /template
  const [loadError, setLoadError] = useState(null);
  const [copy, setCopy] = useState({});
  const [cc, setCc] = useState("");
  const [withRos, setWithRos] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`${SPEAKERS}/template`).then((r) => {
      setLoaded(r);
      const { cc: list, ...rest } = r.template || {};
      setCopy(tidyCopy(rest));
      setCc(listText(list));
    }, setLoadError);
  }, []);

  const savedCopy = useMemo(() => {
    const { cc: list, ...rest } = loaded?.template || {}; // eslint-disable-line no-unused-vars
    return tidyCopy(rest);
  }, [loaded]);
  const dirty = !!loaded && (JSON.stringify(tidyCopy(copy)) !== JSON.stringify(savedCopy) || cc !== listText(loaded.template?.cc));
  const preview = useLivePreview(`${SPEAKERS}/preview-sample`, { template: true, ...tidyCopy(copy), cc, withRunOfShow: withRos }, { enabled: !!loaded });
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put(`${SPEAKERS}/template`, { ...tidyCopy(copy), cc });
      setLoaded(r);
      toast.success("Speaker Pass email saved");
      onSaved?.(r);
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-7xl"
      title="Edit the Speaker Pass email"
      description="Every Speaker Pass email uses this from now on, Send to all included. A speaker's own wording (in their preview) still wins."
      footer={canEdit ? (
        <>
          <Button variant="primary" icon={Save} loading={saving} disabled={!loaded || !dirty} onClick={save}>Save</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </>
      ) : <Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {loadError ? <ErrorState error={loadError} title="Couldn't load the email" /> : !loaded ? <LoadingState label="Loading…" /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <EmailCopyEditor fields={loaded.fields} sections={loaded.sections} value={copy} onChange={setCopy} defaults={loaded.defaults}
              placeholders={loaded.placeholders} disabled={!canEdit}
              note="The grey text is for a speaker with a run of show; the subject, message and contact box adapt when a speaker has no sessions." />
            <ListField
              label="Cc on every Speaker Pass email and calendar invite"
              hint="Separate addresses with commas. Leave empty to cc nobody."
              value={cc}
              onChange={setCc}
              placeholder="lubna@thetechfestival.com, baldeep@thetechfestival.com"
              disabled={!canEdit}
            />
            {loaded.updatedAt && <p className="text-xs text-ttfc-dim">Last saved {when(loaded.updatedAt)}{loaded.updatedBy ? ` by ${loaded.updatedBy}` : ""}.</p>}
          </div>
          <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Preview (a made-up speaker)</p>
              <label className="inline-flex items-center gap-1.5 text-xs text-ttfc-muted">
                <input type="checkbox" checked={withRos} onChange={(e) => setWithRos(e.target.checked)} className="h-4 w-4 accent-ttfc-pink" />
                With a run of show
              </label>
            </div>
            {preview.error && !preview.data ? <ErrorState error={preview.error} title="Couldn't render the preview" />
              : preview.data ? <EmailPreview preview={preview.data} loading={preview.loading} error={preview.error} title="Speaker Pass email preview" />
                : <LoadingState label="Building the preview…" />}
          </div>
        </div>
      )}
    </Drawer>
  );
}

/** One speaker's own wording (saved on their pass; every send to them uses it, Send to all too). */
export function SpeakerWording({ id, wording, defaults = {}, canSave }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const { value = {}, setValue, dirty, fields = [], sections = [], markSaved } = wording;
  // "Name on the pass" (the pass's label) sits with the pass fields.
  const withLabel = useMemo(() => {
    const at = fields.findIndex((f) => f.section === "pass");
    const label = { key: "label", section: "pass", label: "Name on the pass", type: "line", max: 40, hint: "On the badge and in the headings, e.g. Speaker Pass · Keynote." };
    const out = [...fields];
    out.splice(at < 0 ? out.length : at, 0, label);
    return out;
  }, [fields]);
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put(`${SPEAKERS}/${encodeURIComponent(id)}/copy`, tidyCopy(value));
      markSaved(r);
      toast.success("Saved for this speaker. Every send to them uses it.");
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <EmailCopyEditor fields={withLabel} sections={sections} value={value} onChange={setValue}
        defaults={{ ...defaults, label: defaults.passName }} placeholders={["{firstName}", "{fullName}", "{passName}", "{ticketId}", "{sessions}"]}
        note="For this speaker only. Empty fields use Edit email's wording (shown in grey)." />
      {canSave && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" icon={Save} loading={saving} disabled={!dirty} onClick={save}>Save for this speaker</Button>
          {dirty && <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => setValue(wording.saved)}>Undo changes</Button>}
          <span className="text-xs text-ttfc-dim">{dirty ? "Not saved: a send now uses what you see." : "Saved on their pass."}</span>
        </div>
      )}
    </div>
  );
}

/** Edit email for Issue passes / Exhibitor passes: every pass of that kind, per pass type where it differs. */
export function PassTemplateDrawer({ base, title, canEdit, onClose, onSaved }) {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi(`${base}/email`);
  const [draft, setDraft] = useState(null);
  const [tier, setTier] = useState(null);
  const [saving, setSaving] = useState(false);
  const saved = useMemo(() => tidyCopy(data?.copy || {}), [data]);
  const value = draft || saved;
  const dirty = !!draft && JSON.stringify(tidyCopy(draft)) !== JSON.stringify(saved);
  const current = tier || data?.defaultTier || "connect";
  const fields = data?.fields || [];
  const tierLabel = data?.tiers?.find((t) => t.key === current)?.label || "";
  const preview = useLivePreview(`${base}/email/preview`, { ...tidyCopy(value), tier: current }, { enabled: !!data });
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put(`${base}/email`, tidyCopy(draft));
      setData(r);
      setDraft(null);
      toast.success("Email saved for every pass. A pass's own wording still wins.");
      onSaved?.(r);
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-7xl"
      title={title}
      description={`The wording every pass email starts from. A pass's own wording and name (Edit on the list) still win.${data?.updatedBy ? ` Last saved by ${data.updatedBy} ${when(data.updatedAt)}.` : ""}`}
      footer={canEdit ? (
        <>
          <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={save}>Save</Button>
          {dirty && <Button variant="ghost" icon={RotateCcw} onClick={() => setDraft(null)}>Discard changes</Button>}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </>
      ) : <Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {loading ? <LoadingState label="Loading…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : data && (
        <>
          <Tabs label="Pass type" value={current} onChange={setTier}
            tabs={(data.tiers || []).map((t) => ({ key: t.key, label: t.label, count: countSet(value, fields.filter((f) => f.tier), t.key) || undefined }))} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="min-w-0">
              <EmailCopyEditor fields={fields} sections={data.sections} value={value} onChange={setDraft} defaults={data.defaults?.[current] || {}}
                tier={current} tierLabel={tierLabel} placeholders={data.placeholders} disabled={!canEdit}
                note={`Fields marked "${tierLabel} only" are for ${tierLabel} holders; the rest go on every pass.`} />
            </div>
            <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
              <p className="mb-2 text-sm font-semibold">Preview: {tierLabel} (Jane Doe, made up)</p>
              {preview.error && !preview.data ? <ErrorState error={preview.error} title="Couldn't render the preview" />
                : preview.data ? <EmailPreview preview={preview.data} loading={preview.loading} error={preview.error} title="Pass email preview"
                  attachment={preview.data.attachments?.[0]?.filename} />
                  : <LoadingState label="Building the preview…" />}
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
}
