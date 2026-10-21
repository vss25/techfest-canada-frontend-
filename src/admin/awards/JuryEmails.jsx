import { useState } from "react";
import { RotateCcw, Save, Send } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Button, Card, ErrorState, LoadingState, SectionTitle, Tabs } from "../ui";
import { EmailCopyEditor, EmailPreview } from "../tickets/EmailCopyEditor";
import { useLivePreview } from "../tickets/speakerEmailHooks";
import { JURY } from "./juryShared";

/* The jury emails' wording (Admin › Catalyst Awards › Jury): the invite and
   the reminder. Every word editable (management saves), a live preview with a
   made-up juror, and "Send me a test" (staff too, to their own address).
   Nothing goes to a juror from here: they're sent from the jurors list.
   Backend: /console/jury/email/:kind (services/juryEmailCopy.js). */

const KINDS = [
  { key: "invite", label: "Invite email" },
  { key: "reminder", label: "Reminder email" },
];

function Editor({ kind, canEdit }) {
  const toast = useToast();
  const t = useApi(`${JURY}/email/${kind}`);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const value = draft ?? t.data?.copy ?? {};
  const preview = useLivePreview(`${JURY}/email/${kind}/preview`, value, { enabled: !!t.data });
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(t.data?.copy || {});

  if (t.loading) return <LoadingState label="Loading the wording…" />;
  if (t.error && !t.data) return <ErrorState error={t.error} onRetry={t.reload} />;

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put(`${JURY}/email/${kind}`, value);
      t.setData(r);
      setDraft(null);
      toast.success("Wording saved");
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  const test = async () => {
    setTesting(true);
    try {
      const r = await api.post(`${JURY}/email/${kind}/send-test`, value);
      toast.success(`Test sent to ${r.to}`);
    } catch (err) { toast.error(err); } finally { setTesting(false); }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        {!canEdit && <Banner tone="info" title="Only management can change the wording">You can read it, preview it and send yourself a test.</Banner>}
        <EmailCopyEditor fields={t.data.fields} sections={t.data.sections} value={value} onChange={setDraft} defaults={t.data.defaults}
          placeholders={t.data.placeholders} disabled={!canEdit}
          note={t.data.updatedBy ? `Last saved by ${t.data.updatedBy}.` : "Nothing changed yet: this is the built-in wording."} />
        <div className="flex flex-wrap gap-2">
          {canEdit && <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={save}>Save wording</Button>}
          {canEdit && dirty && <Button variant="ghost" icon={RotateCcw} onClick={() => setDraft(null)}>Discard changes</Button>}
          <Button icon={Send} loading={testing} onClick={test}>Send me a test</Button>
        </div>
      </div>
      <div className="min-w-0">
        <p className="mb-2 text-xs text-ttfc-dim">Preview with a made-up juror (Jordan Example, 8 of 12 submitted). Real sends use each juror's name, email and progress.</p>
        <EmailPreview preview={preview.data} loading={preview.loading} error={preview.error} title={`Jury ${kind} preview`} />
      </div>
    </div>
  );
}

export default function JuryEmails({ canEdit }) {
  const [kind, setKind] = useState("invite");
  return (
    <Card>
      <SectionTitle hint="From and reply-to enquire@thetechfestival.com. Sent only when management clicks Send invite or Send reminder. {firstName}, {assigned}, {remaining}, {deadline} and the others are filled in for each juror.">
        Email wording
      </SectionTitle>
      <Tabs tabs={KINDS} value={kind} onChange={setKind} label="Email" />
      <Editor key={kind} kind={kind} canEdit={canEdit} />
    </Card>
  );
}
