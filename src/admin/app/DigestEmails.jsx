import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Info, Mail, MailCheck, MailX, Moon, ShieldCheck, Sunset, Users } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Button, Card, ConfirmDialog, ErrorState, LoadingState, PageHeader, SectionTitle, StatTile, Switch } from "../ui";
import { num, when } from "../format";
import { useLivePreview } from "../tickets/speakerEmailHooks";
import EmailPreview from "./EmailPreview";

/* =========================================================
   Admin → Website & app → "What you missed" emails (Oct 22 2026)
   The organiser: "a summary email of updates/items missed by the
   individual … after 3 hours of the first activity. And at 5 pm
   also. If the 3 hours update happens in the next 1 hour of 5 pm,
   skip." The backend schedules and sends them (services/digest.js);
   this page:
     - the on/off switch (OFF until the organiser turns it on;
       management),
     - sent / waiting / failed today against the daily safety cap,
     - the timing rules, as the server reports them,
     - a preview (your own last 2 days in the app, else sample
       items) and "Send me a test digest". The wording is fixed.
   Backend (routes/digest.js), all under BASE:
     GET  /console/digest           → { enabled, sentToday, failedToday, waiting, dailyCap, day, lastRun, canEdit, rules }
     PUT  /console/digest {enabled} → the same
     POST /console/digest/preview   → { subject, preheader, html, text, sections, sample }
     POST /console/digest/test      → { sent, to, sample }
   The unsubscribe link in each email goes to the backend's own page
   (GET / POST /api/app/digest/unsubscribe?t=).
========================================================= */

const BASE = "/console/digest";
const TZ = "America/Toronto";

/** When the next 5:00 PM run is, in Toronto: "today" or "tomorrow". */
function nextFivePm(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(now));
  return hour < 17 ? "today" : "tomorrow";
}

function ruleLines(r = {}) {
  const delay = r.delayHours || 3;
  return [
    { icon: Clock, text: `About ${delay} hours after the first thing someone misses (a message, a reply, a mention, a like on their post, chat messages), if they haven't opened the app since.` },
    { icon: Sunset, text: `Every day at ${r.fivePm || "5:00 PM"} Toronto time, for anyone with something new they haven't seen. A ${delay}-hour email due ${r.skipWindow || "between 4 and 5 PM (the 5 PM one covers it)"} is skipped.` },
    { icon: Moon, text: `Never during quiet hours, ${r.quietHours || "9:00 PM – 8:00 AM (due then → 8:00 AM)"}; never two within ${r.minGapMinutes || 60} minutes; at most ${r.maxPerDay || 3} a day per person; each item only once.` },
    { icon: ShieldCheck, text: "Nothing from hidden or blocked people. People switch it off in the app (Settings › Notification settings) or with the unsubscribe link in every email." },
  ];
}

export default function DigestEmails() {
  const toast = useToast();
  const status = useApi(BASE, { interval: 60000 });
  const preview = useLivePreview(`${BASE}/preview`, {}, { enabled: true, delay: 0 });
  const [confirm, setConfirm] = useState(null); // true | false: the switch's next value, waiting for OK
  const [switching, setSwitching] = useState(false);
  const [testing, setTesting] = useState(false);

  const st = status.data;
  const rules = useMemo(() => ruleLines(st?.rules), [st?.rules]);
  const five = nextFivePm();

  const flip = async (enabled) => {
    setConfirm(null);
    setSwitching(true);
    try {
      const r = await api.put(BASE, { enabled });
      status.setData((d) => ({ ...(d || {}), ...r }));
      toast.success(enabled ? "“What you missed” emails are on" : "“What you missed” emails are off");
    } catch (e) { toast.error(e); } finally { setSwitching(false); }
  };
  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await api.post(`${BASE}/test`, {});
      toast.success(`Test sent to ${r.to || "your email"}${r.sample ? ", with sample items" : ", from your own activity"}. It isn't counted.`);
    } catch (e) { toast.error(e); } finally { setTesting(false); }
  };

  const enabled = !!st?.enabled;
  const cap = st?.dailyCap || 0;
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
            <Switch size="lg" checked={enabled} disabled={switching || !st?.canEdit} onChange={(v) => setConfirm(v)}
              label={enabled ? "On: emails go out on the schedule below" : "Off: no “What you missed” emails are sent"}
              description={st?.canEdit ? "Off until you turn it on. Turning it off stops the next run; nothing already sent changes." : "Only management can turn these emails on or off."} />
            <p className="mt-3 text-xs text-ttfc-dim">
              {st?.lastRun ? `Last checked ${when(st.lastRun)}. ` : ""}{enabled ? `Next 5 PM run ${five} at 5:00 PM Toronto time.` : ""}
            </p>
          </Card>

          {capHit && (
            <Banner tone="warn" icon={AlertTriangle} className="mb-6" title={`Today's safety cap of ${num(cap)} emails is reached`}>
              No more “What you missed” emails go out today. They start again tomorrow.
            </Banner>
          )}

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatTile label="Sent today" value={num(st?.sentToday || 0)} icon={MailCheck} tone="purple" hint={cap ? `Safety cap ${num(cap)} a day · Toronto time` : "Toronto time"} />
            <StatTile label="Waiting" value={num(st?.waiting || 0)} icon={Users} tone="orange" hint="People with something new they haven't seen" />
            <StatTile label="Failed today" value={num(st?.failedToday || 0)} icon={MailX} tone={st?.failedToday ? "bad" : "good"} hint="Tried again on the next run" />
          </div>
        </>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <SectionTitle>When they go out</SectionTitle>
            <ul className="flex flex-col gap-3 text-sm">
              {rules.map((r) => (
                <li key={r.text} className="flex gap-3"><r.icon className="mt-0.5 h-4 w-4 flex-none text-ttfc-pink" aria-hidden="true" /><span className="text-ttfc-muted">{r.text}</span></li>
              ))}
            </ul>
          </Card>
          <Banner tone="info" icon={Info} title="The wording is fixed">
            Each email lists what that person missed, grouped by kind, with names and short snippets, an Open TTFC button and an unsubscribe link.
          </Banner>
        </div>

        <Card className="min-w-0">
          <SectionTitle hint={preview.data ? (preview.data.sample ? "Made-up sample items (you have no app activity in the last 2 days)." : "Built from your own app activity in the last 2 days.") : undefined}>Preview</SectionTitle>
          <EmailPreview title="“What you missed” email preview" preview={preview.data} loading={preview.loading} error={preview.error} />
        </Card>
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
