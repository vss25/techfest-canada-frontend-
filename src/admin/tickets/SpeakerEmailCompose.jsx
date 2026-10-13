import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Button, Drawer, ErrorState, Field, Input, LoadingState, Textarea } from "../ui";
import { when } from "../format";
import { listText, useLivePreview } from "./speakerEmailHooks";

/* =========================================================
   Speaker Pass email: editable wording, recipients and cc
   ---------------------------------------------------------
   Used by Admin → Speaker passes (SpeakerPasses.jsx):
     - TemplateDrawer ("Edit email"): the saved subject, headline,
       message and cc list every Speaker Pass email uses;
     - CopyFields / ListField: the same fields inside a speaker's
       preview, to change them for that one send;
     - useLivePreview: re-renders the email as you type.
   Backend (under /console/speaker-passes):
     GET  /template → { template: { subject, headline, message, cc }, defaults }
     PUT  /template (management)
     POST /preview-sample, POST /:id/preview  { to?, cc?, subject?, headline?, message? }
   An empty wording field means "the built-in text".
========================================================= */

export const BASE = "/console/speaker-passes";
export const PLACEHOLDER_HINT = "{firstName} and {fullName} are filled in for each speaker.";

/** Subject, headline and message. `defaults` fill in what the built-in text says. */
export function CopyFields({ value, onChange, defaults = {}, disabled }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const reset = (k) => onChange({ ...value, [k]: "" });
  const field = (k, label, input) => (
    <Field
      label={(
        <span className="flex items-center justify-between gap-2">
          <span>{label}</span>
          {value[k] && !disabled && (
            <button type="button" onClick={() => reset(k)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-ttfc-muted hover:text-ttfc-text">
              <RotateCcw className="h-3 w-3" aria-hidden="true" /> Built-in text
            </button>
          )}
        </span>
      )}
    >
      {input}
    </Field>
  );
  return (
    <div className="flex flex-col gap-3">
      {field("subject", "Subject", (id) => (
        <Input id={id} value={value.subject || ""} onChange={set("subject")} placeholder={defaults.subject} maxLength={200} disabled={disabled} />
      ))}
      {field("headline", "Headline", (id) => (
        <Input id={id} value={value.headline || ""} onChange={set("headline")} placeholder={defaults.headline} maxLength={200} disabled={disabled} />
      ))}
      {field("message", "Message", (id) => (
        <Textarea id={id} rows={5} value={value.message || ""} onChange={set("message")} placeholder={defaults.message} maxLength={3000} disabled={disabled} />
      ))}
      <p className="text-xs text-ttfc-dim">Empty fields use the built-in text shown in grey. {PLACEHOLDER_HINT} A blank line starts a new paragraph. The pass, run of show and RSVP button stay as they are.</p>
    </div>
  );
}

/** A comma-separated list of email addresses. */
export function ListField({ label, hint, value, onChange, placeholder, disabled }) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          autoComplete="off" spellCheck={false} inputMode="email" disabled={disabled} />
      )}
    </Field>
  );
}

/** The email in a sandboxed frame. */
export function EmailFrame({ preview, title = "Email preview" }) {
  if (!preview) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-ttfc-line">
      <div className="border-b border-ttfc-line bg-ttfc-panel2 px-3 py-2 text-xs">
        <p className="truncate"><span className="text-ttfc-dim">Subject</span> <b>{preview.subject || "—"}</b></p>
        {preview.to && <p className="truncate text-ttfc-muted"><span className="text-ttfc-dim">To:</span> {preview.to}</p>}
        {preview.cc?.length > 0 && <p className="truncate text-ttfc-muted"><span className="text-ttfc-dim">Cc:</span> {listText(preview.cc)}</p>}
      </div>
      <iframe title={title} sandbox="" srcDoc={preview.html || ""} className="block h-[60vh] min-h-[420px] w-full bg-white" />
    </div>
  );
}

/** "Edit email": the wording and cc list every Speaker Pass email uses. */
export function TemplateDrawer({ canEdit, onClose, onSaved }) {
  const toast = useToast();
  const [loaded, setLoaded] = useState(null); // { template, defaults, updatedAt, updatedBy }
  const [loadError, setLoadError] = useState(null);
  const [copy, setCopy] = useState({ subject: "", headline: "", message: "" });
  const [cc, setCc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`${BASE}/template`).then((r) => {
      setLoaded(r);
      setCopy({ subject: r.template.subject, headline: r.template.headline, message: r.template.message });
      setCc(listText(r.template.cc));
    }, setLoadError);
  }, []);

  const preview = useLivePreview(`${BASE}/preview-sample`, { ...copy, cc }, { enabled: !!loaded });
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put(`${BASE}/template`, { ...copy, cc });
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
      width="max-w-3xl"
      title="Edit the Speaker Pass email"
      description="Changes apply to every Speaker Pass email from now on, including Send to all. You can still change them for a single send in a speaker's preview."
      footer={canEdit ? (
        <>
          <Button variant="primary" icon={Save} loading={saving} disabled={!loaded} onClick={save}>Save</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </>
      ) : <Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {loadError ? <ErrorState error={loadError} title="Couldn't load the email" /> : !loaded ? <LoadingState label="Loading…" /> : (
        <div className="flex flex-col gap-5">
          <CopyFields value={copy} onChange={setCopy} defaults={loaded.defaults} disabled={!canEdit} />
          <ListField
            label="Cc on every Speaker Pass email and calendar invite"
            hint="Separate addresses with commas. Leave empty to cc nobody."
            value={cc}
            onChange={setCc}
            placeholder="lubna@thetechfestival.com, baldeep@thetechfestival.com"
            disabled={!canEdit}
          />
          {loaded.updatedAt && <p className="text-xs text-ttfc-dim">Last saved {when(loaded.updatedAt)}{loaded.updatedBy ? ` by ${loaded.updatedBy}` : ""}.</p>}
          <div>
            <p className="mb-2 text-sm font-semibold">Preview (sample speaker)</p>
            {preview.error && !preview.data ? <ErrorState error={preview.error} title="Couldn't render the preview" /> : <EmailFrame preview={preview.data} title="Speaker Pass email preview" />}
            {preview.error && preview.data && <p className="mt-2 text-xs text-red-200">{preview.error.message}</p>}
          </div>
        </div>
      )}
    </Drawer>
  );
}
