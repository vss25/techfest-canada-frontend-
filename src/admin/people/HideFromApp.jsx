import { useState } from "react";
import { Link } from "react-router-dom";
import { EyeOff, Eye, Pencil, ShieldAlert } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, Field, Modal, SectionTitle, Textarea } from "../ui";
import { when } from "../format";
import { HIDDEN_HINT, HIDDEN_LABEL, whileHiddenText } from "./peopleMeta";

/* =========================================================
   Hide from app (shadow mode, Oct 21 2026): for someone who's
   trying to cause trouble at the event. They use the app as
   normal and aren't told; nobody else sees them or anything they
   do (backend services/appHide.js: POST /console/people/:id/
   app-hide { reason } and …/app-unhide { removeWhileHidden }).
   Used on the People profile (HideCard) and in App moderation
   › Hidden people (UnhideDialog, HiddenBadge). Words in
   peopleMeta.js (HIDDEN_LABEL, whileHiddenText).
========================================================= */

/** "Hidden from app" (red). `hint`: the tooltip. */
export function HiddenBadge({ hint = HIDDEN_HINT, className }) {
  return <span title={hint} className={className}><Badge tone="bad" icon={EyeOff}>{HIDDEN_LABEL}</Badge></span>;
}

const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "them";

/** What happens, in the order the organiser asked for it. */
const WHAT_HAPPENS = [
  "Nobody else sees them in Network, search, group member lists or anyone's connections. Their profile and connect QR show as not found.",
  "They can still send messages, but nobody gets them: no chat, no notification, no unread count.",
  "They can still post, comment, like, reply, vote and ask questions. Only they see it, and it doesn't count anywhere.",
  "Their connection requests look sent to them but never arrive.",
  "Everything they posted before now is hidden from others too. Nothing is deleted.",
  "Their pass, door check-in, agenda, RSVP and Wallet pass keep working.",
  "Staff and moderators still see all of it, marked “Hidden from app”.",
];

function HideDialog({ open, onClose, personId, name, onAccount, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = () => { if (!busy) { setError(""); onClose(); } };
  const hide = async () => {
    setBusy(true); setError("");
    try {
      const r = await api.post(`/console/people/${encodeURIComponent(personId)}/app-hide`, { reason: reason.trim() });
      toast.success(`${name} is hidden from the app`);
      setReason("");
      onDone?.(r.appHide);
      onClose();
    } catch (err) { setError(err?.message || "Couldn't hide them. Try again."); }
    finally { setBusy(false); }
  };
  return (
    <Modal
      open={open} onClose={close} tone="danger" size="lg"
      title={`Hide ${firstName(name)} from the app?`}
      description={`${name} won't be told. The app will look normal to them.`}
      footer={(
        <>
          <Button onClick={close} disabled={busy} data-autofocus>Cancel</Button>
          <Button variant="danger" icon={EyeOff} loading={busy} onClick={hide}>Hide from app</Button>
        </>
      )}
    >
      <p className="mb-2 text-sm font-semibold">What happens</p>
      <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ttfc-text/90">
        {WHAT_HAPPENS.map((t) => <li key={t}>{t}</li>)}
      </ul>
      {!onAccount && (
        <Banner tone="info" className="mb-4">They aren't on the app yet. They'll be hidden from the moment they sign in.</Banner>
      )}
      <Field label="Private note for staff (optional)" hint="Why you're hiding them. Only staff see this, never the person.">
        {(id) => <Textarea id={id} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: sending unwanted messages to several attendees" />}
      </Field>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
    </Modal>
  );
}

/** Show someone again, with the option to take down what they posted while hidden. Used in People and App moderation. */
export function UnhideDialog({ open, onClose, personId, name, whileHidden, labels, onDone }) {
  const toast = useToast();
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = () => { if (!busy) { setError(""); setRemove(false); onClose(); } };
  const total = whileHidden?.total || 0;
  const summary = whileHiddenText(whileHidden, labels);
  const unhide = async () => {
    setBusy(true); setError("");
    try {
      const r = await api.post(`/console/people/${encodeURIComponent(personId)}/app-unhide`, { removeWhileHidden: remove });
      const n = r.removed?.total || 0;
      toast.success(remove ? `${name} is back in the app. ${n} ${n === 1 ? "item" : "items"} from while they were hidden taken down.` : `${name} is back in the app`);
      setRemove(false);
      onDone?.(r.appHide);
      onClose();
    } catch (err) { setError(err?.message || "Couldn't show them again. Try again."); }
    finally { setBusy(false); }
  };
  return (
    <Modal
      open={open} onClose={close} size="lg"
      title={`Show ${firstName(name)} in the app again?`}
      description={`Everyone will see ${name} again, and everything they posted before they were hidden. They won't be told.`}
      footer={(
        <>
          <Button onClick={close} disabled={busy} data-autofocus>Cancel</Button>
          <Button variant="primary" icon={Eye} loading={busy} onClick={unhide}>Show in app</Button>
        </>
      )}
    >
      {whileHidden ? (
        total ? (
          <Banner tone="warn" icon={ShieldAlert} className="mb-4" title="What they posted while hidden will appear to others too">
            {summary}
          </Banner>
        ) : <p className="mb-4 text-sm text-ttfc-muted">They haven't posted anything while hidden.</p>
      ) : (
        <p className="mb-4 text-sm text-ttfc-muted">They have no app account, so there's nothing they posted.</p>
      )}
      {total > 0 && (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ttfc-line bg-ttfc-panel2 p-3.5">
          <input type="checkbox" checked={remove} onChange={(e) => setRemove(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-ttfc-pink" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Also remove what they posted while hidden</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-ttfc-muted">
              Their posts, comments, chat and group messages, discussions, replies, groups and session questions from while they were hidden are taken down
              (staff can still read them in App moderation). Connection requests they sent while hidden are cancelled. Likes, poll votes and group joins stay.
            </span>
          </span>
        </label>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
    </Modal>
  );
}

/** The private note, editable while they're hidden. */
function ReasonEditor({ personId, reason, onDone }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reason || "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/console/people/${encodeURIComponent(personId)}/app-hide`, { reason: draft.trim() });
      toast.success("Note saved");
      setEditing(false);
      onDone?.(r.appHide);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm"><span className="text-ttfc-muted">Private note: </span>{reason ? <span className="whitespace-pre-wrap break-words">{reason}</span> : <span className="text-ttfc-dim">None</span>}</p>
        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => { setDraft(reason || ""); setEditing(true); }}>{reason ? "Edit note" : "Add a note"}</Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Field label="Private note for staff" hint="Only staff see this.">
        {(id) => <Textarea id={id} rows={2} maxLength={500} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />}
      </Field>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" loading={busy} onClick={save}>Save note</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  );
}

/** People profile card. `appHide`: GET /console/people/:id `appHide`; `onChanged` reloads the profile. */
export function HideCard({ personId, name, appHide, onChanged }) {
  const [hiding, setHiding] = useState(false);
  const [showing, setShowing] = useState(false);
  if (!appHide) return null;
  const h = appHide;
  return (
    <Card className={h.hidden ? "border-red-400/30" : undefined}>
      <SectionTitle hint="For someone causing trouble at the event. They aren't told.">Hide from app</SectionTitle>
      {h.hidden ? (
        <div className="space-y-3">
          <Banner tone="danger" icon={EyeOff} title={HIDDEN_LABEL}>
            Since {when(h.at)}{h.byName ? ` · by ${h.byName}` : ""}. Nobody else in the app sees them or anything they do. They haven't been told.
          </Banner>
          <ReasonEditor key={h.reason} personId={personId} reason={h.reason} onDone={onChanged} />
          <p className="text-sm text-ttfc-muted">
            {!h.onApp ? "Not on the app yet: they'll be hidden from the moment they sign in."
              : h.whileHidden?.total ? `While hidden: ${whileHiddenText(h.whileHidden, h.labels)}.`
                : "They haven't posted anything while hidden."}
            {h.onApp && h.whileHidden?.total > 0 && (
              <> <Link to="/admin/app/moderation?tab=post&only=hidden" className="text-ttfc-pink hover:underline">See it in App moderation</Link></>
            )}
          </p>
          {h.canChange && <Button variant="primary" icon={Eye} onClick={() => setShowing(true)}>Show in app again…</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-ttfc-muted">
            They'll use the app as normal, but nobody else will see them or anything they do: messages, posts, comments, likes, requests.
            Their pass, check-in, agenda and Wallet pass keep working. You can show them again any time.
          </p>
          {h.canChange
            ? <Button variant="dangerOutline" icon={EyeOff} onClick={() => setHiding(true)}>Hide from app…</Button>
            : <p className="text-sm text-ttfc-dim">{h.why || "Only management and moderators can hide people from the app."}</p>}
        </div>
      )}
      <HideDialog open={hiding} onClose={() => setHiding(false)} personId={personId} name={name} onAccount={h.onApp} onDone={onChanged} />
      <UnhideDialog open={showing} onClose={() => setShowing(false)} personId={personId} name={name} whileHidden={h.whileHidden} labels={h.labels} onDone={onChanged} />
    </Card>
  );
}
