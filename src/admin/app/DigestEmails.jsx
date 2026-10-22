import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Info, Mail, MailCheck, MailX, Moon, RotateCcw, Save, ShieldCheck, Sunset, Users } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { Banner, Button, Card, ConfirmDialog, ErrorState, LoadingState, PageHeader, SectionTitle, StatTile, Switch } from "../ui";
import { num, when } from "../format";
import { EmailCopyEditor } from "../tickets/EmailCopyEditor";
import { useLivePreview } from "../tickets/speakerEmailHooks";
import EmailPreview from "./EmailPreview";

/* =========================================================
   Admin → Website & app → "What you missed" emails (Oct 22 2026)
   The organiser: "a summary email of updates/items missed by the
   individual … after 3 hours of the first activity. And at 5 pm
   also. If the 3 hours update happens in the next 1 hour of 5 pm,
   skip." The backend schedules and sends them; this page:
     - the on/off switch (OFF until the organiser turns it on),
     - sent / skipped / failed today against the daily safety cap,
     - "Send me a test digest" (to your own email),
     - the wording editor and preview when the server has one
       (a 404 on the template hides it: the built-in wording is used).
   All calls are under BASE, so a changed route is one edit here:
     GET   /console/digest            → { enabled, sentToday, skippedToday, failedToday, cap, lastRunAt, nextFivePm, waiting }
     PATCH /console/digest { enabled } → the same
     POST  /console/digest/test        → { to }
     GET / PUT /console/digest/template, POST /console/digest/preview (optional)
========================================================= */

const BASE = "/console/digest";

const RULES = [
  { icon: Clock, text: "About 3 hours after the first thing someone misses (a message, a reply, a mention, a like on their post, chat messages), if they haven't opened the app since." },
  { icon: Sunset, text: "Every day at 5:00 PM Toronto time, for anyone with something new they haven't seen. A 3-hour email due between 4 and 5 PM is skipped: the 5 PM one covers it." },
  { icon: Moon, text: "Never between 9 PM and 8 AM (one due then goes at 8 AM), never two within an hour, at most 3 a day, and each item only once." },
  { icon: ShieldCheck, text: "Nothing from hidden or blocked people. People can switch it off in the app (Settings › Notifications) or with the unsubscribe link in every email." },
];

export default function DigestEmails() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const status = useApi(BASE, { interval: 60000 });
  const template = useApi(`${BASE}/template`);
  const [confirm, setConfirm] = useState(null); // true | false: the switch's next value, waiting for OK
  const [switching, setSwitching] = useState(false);
  const [testing, setTesting] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const st = status.data;
  // No template route on the server: the built-in wording, and no editor.
  const noTemplate = template.error?.status === 404;
  const t = noTemplate ? null : template.data;
  useEffect(() => { if (t && !draft) setDraft({ ...t.copy }); }, [t, draft]);
  const copy = draft || {};
  const preview = useLivePreview(`${BASE}/preview`, copy, { enabled: !!t });
  const dirty = !!t && JSON.stringify(t.copy || {}) !== JSON.stringify(copy);

  const flip = async (enabled) => {
    setConfirm(null);
    setSwitching(true);
    try {
      const r = await api.patch(BASE, { enabled });
      status.setData((d) => ({ ...(d || {}), ...r }));
      toast.success(enabled ? "“What you missed” emails are on" : "“What you missed” emails are off");
    } catch (e) { toast.error(e); } finally { setSwitching(false); }
  };
  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await api.post(`${BASE}/test`, t ? copy : {});
      toast.success(`Test sent to ${r.to || "your email"}. It isn't counted.`);
    } catch (e) { toast.error(e); } finally { setTesting(false); }
  };
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put(`${BASE}/template`, copy);
      template.setData?.(r);
      setDraft({ ...r.copy });
      toast.success("Email wording saved");
    } catch (e) { toast.error(e); } finally { setSaving(false); }
  };

  const enabled = !!st?.enabled;
  const cap = st?.cap || 0;
  const capHit = cap > 0 && (st?.sentToday || 0) >= cap;

  return (
    <>
      <PageHeader
        eyebrow="Website & app"
        title="“What you missed” emails"
        description="A short email to people who missed things in the app: messages, replies, mentions, likes on their posts and chat messages, each linking back to the app. Sent from enquire@thetechfestival.com."
        actions={<Button icon={Mail} loading={testing} onClick={sendTest}>Send me a test digest</Button>}
      />

      {status.loading && !st ? <LoadingState label="Loading…" /> : status.error && !st ? <ErrorState error={status.error} onRetry={status.reload} /> : (
        <>
          <Card className="mb-6">
            <Switch size="lg" checked={enabled} disabled={switching || !isManagement} onChange={(v) => setConfirm(v)}
              label={enabled ? "On: emails go out on the schedule below" : "Off: no “What you missed” emails are sent"}
              description={isManagement ? "Off until you turn it on. Turning it off stops the next run; nothing already sent changes." : "Only management can turn these emails on or off."} />
            {st?.lastRunAt && <p className="mt-3 text-xs text-ttfc-dim">Last checked {when(st.lastRunAt)}{st.nextFivePm ? ` · next 5 PM run ${when(st.nextFivePm)}` : ""}.</p>}
          </Card>

          {capHit && (
            <Banner tone="warn" icon={AlertTriangle} className="mb-6" title={`Today's safety cap of ${num(cap)} emails is reached`}>
              No more “What you missed” emails go out today. They start again tomorrow.
            </Banner>
          )}

          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile label="Sent today" value={num(st?.sentToday || 0)} icon={MailCheck} tone="purple" hint={cap ? `Safety cap ${num(cap)} a day` : "Toronto time"} />
            <StatTile label="Waiting" value={num(st?.waiting || 0)} icon={Users} tone="orange" hint="People with something new they haven't seen" />
            <StatTile label="Skipped today" value={num(st?.skippedToday || 0)} icon={Clock} tone="neutral" hint="Seen in the app first, or folded into the next one" />
            <StatTile label="Failed today" value={num(st?.failedToday || 0)} icon={MailX} tone={st?.failedToday ? "bad" : "good"} hint="Tried again on the next run" />
          </div>
        </>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <SectionTitle>When they go out</SectionTitle>
            <ul className="flex flex-col gap-3 text-sm">
              {RULES.map((r) => (
                <li key={r.text} className="flex gap-3"><r.icon className="mt-0.5 h-4 w-4 flex-none text-ttfc-pink" aria-hidden="true" /><span className="text-ttfc-muted">{r.text}</span></li>
              ))}
            </ul>
          </Card>

          {t && (
            <Card>
              <SectionTitle hint={t.updatedAt ? `Last saved ${when(t.updatedAt)}${t.updatedBy ? ` by ${t.updatedBy}` : ""}` : "The built-in wording"}>The email's wording</SectionTitle>
              <EmailCopyEditor fields={t.fields} sections={t.sections} value={copy} defaults={t.defaults} placeholders={t.placeholders}
                onChange={(c) => setDraft(c)}
                note={t.canEdit ? "Changes show in the preview straight away. Save to use them for every email." : "You can try wording in the preview and your test; only management can save it."} />
              <div className="mt-4 flex flex-wrap gap-2 border-t border-ttfc-line pt-4">
                {t.canEdit && <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={save}>Save wording</Button>}
                <Button icon={RotateCcw} disabled={!dirty} onClick={() => setDraft({ ...t.copy })}>Undo changes</Button>
              </div>
            </Card>
          )}
          {noTemplate && (
            <Banner tone="info" icon={Info} title="The wording is built in">
              Each email lists what that person missed, grouped by kind, with an Open TTFC button and an unsubscribe link. Send yourself a test to see it.
            </Banner>
          )}
        </div>

        {t && (
          <Card className="min-w-0">
            <SectionTitle hint="Sample activity for a made-up attendee.">Preview</SectionTitle>
            <EmailPreview title="“What you missed” email preview" preview={preview.data} loading={preview.loading} error={preview.error} />
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => flip(!!confirm)}
        title={confirm ? "Turn on “What you missed” emails?" : "Turn off “What you missed” emails?"}
        confirmLabel={confirm ? "Turn on" : "Turn off"}
        tone={confirm ? "info" : "danger"}
      >
        {confirm
          ? "People with an app account who've missed things start getting them on the schedule shown here (at most 3 a day each, never at night). They can switch them off in the app or from any email."
          : "No more “What you missed” emails go out until you turn them back on."}
      </ConfirmDialog>
    </>
  );
}
