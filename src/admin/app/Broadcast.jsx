import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Lock, Megaphone, Send } from "lucide-react";
import { api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { Banner, Button, Card, ConfirmDialog, Field, PageHeader, SectionTitle, Tabs, Textarea } from "../ui";
import PersonalNotify from "./PersonalNotify";
import ScheduledBroadcasts, { ScheduledLocked } from "./ScheduledBroadcasts";

const MODES = [
  { key: "person", label: "Send to a person" },
  { key: "everyone", label: "Announcement to everyone" },
  // Scheduled updates (Oct 27 2026, management only): ./ScheduledBroadcasts.jsx.
  { key: "scheduled", label: "Scheduled" },
];

export default function Broadcast() {
  const { isManagement } = useAdmin();
  const [params, setParams] = useSearchParams();
  const prefillIds = (params.get("to") || "").split(",").filter(Boolean);
  const asked = params.get("mode");
  const mode = !prefillIds.length && (asked === "everyone" || asked === "scheduled") ? asked : "person";
  const setMode = (m) => {
    const p = new URLSearchParams(params);
    if (m === "everyone" || m === "scheduled") { p.set("mode", m); p.delete("to"); } else p.delete("mode");
    setParams(p, { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow="Event day"
        title="Send an app update"
        description={isManagement
          ? "Send a private notification to one person or a few, post an official update everyone sees, or schedule one for later."
          : "Send a private notification to one person or a few. Updates to everyone are sent by management."}
      />
      <Tabs tabs={MODES} value={mode} onChange={setMode} label="Who to send to" />
      <div role="tabpanel">
        {mode === "person" ? <PersonalNotify key={prefillIds.join(",")} prefillIds={prefillIds} />
          : mode === "scheduled" ? (isManagement ? <ScheduledBroadcasts /> : <ScheduledLocked />)
            : <EveryoneAnnouncement canSend={isManagement} />}
      </div>
    </>
  );
}

/** The push to every phone: management only (the server refuses it for staff too). */
function EveryoneAnnouncement({ canSend }) {
  const toast = useToast();
  const [body, setBody] = useState("");
  const [banner, setBanner] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState("");

  const review = (e) => {
    e.preventDefault();
    if (!body.trim()) { setErr("Write a message first"); return; }
    setErr(""); setConfirm(true);
  };

  return (
    <>
      {!canSend && (
        <Banner tone="info" icon={Lock} className="mb-5" title="Management only">
          An update to every phone is sent by management. You can still send a notification to one person or a few on the first tab.
        </Banner>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card as="form" onSubmit={review} className="space-y-5">
          <SectionTitle hint="It appears at the top of the Feed. Phones get a notification right away (or, before push is switched on, the next time the app checks in).">
            Announcement to everyone
          </SectionTitle>
          <Field label="Message" error={err} hint={`${body.length}/4000 characters`}>
            {(id) => (
              <Textarea id={id} rows={6} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} disabled={!canSend}
                placeholder="Doors open at 8:00 AM. Registration is in the Harbour Ballroom Foyer." />
            )}
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ttfc-line p-4">
            <input type="checkbox" checked={banner} onChange={(e) => setBanner(e.target.checked)} disabled={!canSend} className="mt-0.5 h-4 w-4 accent-ttfc-pink" />
            <span>
              <span className="block text-sm font-semibold">Also show it as the banner at the top of Home</span>
              <span className="block text-xs text-ttfc-muted">Replaces the current Home announcement (first 280 characters).</span>
            </span>
          </label>
          <div className="flex justify-end">
            <Button variant="primary" type="submit" icon={canSend ? Send : Lock} disabled={!canSend} title={canSend ? undefined : "Management only"}>
              {canSend ? "Review & send" : "Management only"}
            </Button>
          </div>
        </Card>
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-ttfc-dim">Preview</p>
          <div className="rounded-[22px] border border-ttfc-line bg-ttfc-panel2 p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-ttfc-pink to-ttfc-purple text-white"><Megaphone className="h-4 w-4" aria-hidden="true" /></span>
              <div className="leading-tight">
                <p className="text-sm font-semibold">The Tech Festival Canada</p>
                <p className="text-xs text-ttfc-muted">Organizers · Announcement</p>
              </div>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm text-ttfc-text/90">{body || <span className="text-ttfc-dim">Your message will appear here.</span>}</p>
          </div>
          <Banner tone="warn">Broadcasts go to every app user and can't be unsent. You can hide the post afterwards from Moderation → Posts.</Banner>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        tone="danger"
        title="Send to everyone?"
        body={`This posts to every app user${banner ? " and replaces the Home banner" : ""}. It can't be unsent.`}
        confirmLabel="Yes, send to everyone"
        onConfirm={async () => {
          await api.post("/console/broadcast", { body: body.trim(), banner });
          toast.success("Broadcast sent");
          setBody(""); setBanner(false);
        }}
      >
        <blockquote className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-ttfc-line bg-ttfc-ink/60 p-3 text-sm">{body}</blockquote>
      </ConfirmDialog>
    </>
  );
}
