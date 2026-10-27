import { useEffect, useState } from "react";
import { BellRing, CalendarClock, Clock, Home, Link2, Lock, Moon, Newspaper, Pencil, RefreshCw, Save, Send, X } from "lucide-react";
import { api } from "../api";
import { useApi } from "../hooks";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, SectionTitle, Textarea, focusRing } from "../ui";
import {
  AUDIENCES, LIMITS, QUICK_LINKS, SCHEDULED_PATH, STATUS, TEMPLATES, blankDraft, bodyFrom, checkDraft, draftFrom, inQuietHours, quietFrom, quietLabel,
  reachText, sortItems, whenET,
} from "./scheduled";
import { parseToronto } from "../../lib/swag";

/* =========================================================
   Admin › Event day › Send an app update › Scheduled (Oct 27 2026,
   management only): write an update now, send it later. When (Toronto,
   "Tue Oct 27, 7:00 PM ET"), a title, the message (with a count), a
   link (quick picks: the 2027 page, Rate the app, the Feed, none),
   and where it goes: a post in the feed, the Home banner and / or a
   notification to app users (everyone on the app, checked-in people
   only, or people on an older app version). A ready-made "Update the
   app" fills the form. Previews of the phone notification and the
   feed post.
   Notifications aren't sent in the quiet hours (the server's, 10 PM
   to 8 AM): the form refuses those times. The list: status chips,
   who it reached (or about how many it will), Edit, Cancel and Send
   now, each confirmed on the page. Rules and server calls:
   ./scheduled.js.
========================================================= */

const cx = (...a) => a.filter(Boolean).join(" ");

function Check({ checked, onChange, icon, label, hint, disabled }) {
  const Icon = icon;
  return (
    <label className={cx("flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition", checked ? "border-ttfc-purple/60 bg-ttfc-purple/10" : "border-ttfc-line")}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} className="mt-0.5 h-4 w-4 accent-ttfc-pink" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-semibold"><Icon className="h-4 w-4 text-ttfc-muted" aria-hidden="true" />{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ttfc-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** What phones and the feed will show. */
function Previews({ d }) {
  const title = d.title.trim() || "Your title";
  const body = d.body.trim() || "Your message";
  return (
    <div className="space-y-4">
      {d.notify && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ttfc-dim">Phone notification</p>
          <div className="rounded-[20px] bg-gradient-to-b from-[#2a1c52] to-[#140c2c] p-3">
            <div className="rounded-2xl bg-white/90 p-3 text-[#0d0520] shadow-lg backdrop-blur">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-black/50">
                <img src="/app/icons/icon-96.png" alt="" width="18" height="18" className="rounded" /> TTFC <span className="ml-auto font-normal normal-case">{d.sendAt ? whenET(parseToronto(d.sendAt)).replace(/^\w+ /, "") : "now"}</span>
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug">{title}</p>
              <p className="line-clamp-2 text-sm leading-snug text-black/75">{body}</p>
            </div>
          </div>
        </div>
      )}
      {d.feedPost && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ttfc-dim">Feed post</p>
          <div className="rounded-2xl border border-ttfc-line bg-ttfc-panel2/60 p-4">
            <div className="flex items-center gap-2.5">
              <img src="/app/icons/icon-96.png" alt="" width="36" height="36" className="rounded-xl" />
              <span className="min-w-0">
                <b className="block text-sm">The Tech Festival Canada</b>
                <span className="block text-xs text-ttfc-muted">Official update</span>
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold">{title}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-ttfc-muted">{body}</p>
            {d.linkUrl.trim() && <p className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate rounded-lg bg-ttfc-contrast/5 px-2 py-1 font-mono text-xs"><Link2 className="h-3.5 w-3.5" aria-hidden="true" />{d.linkUrl.trim()}</p>}
          </div>
        </div>
      )}
      {d.banner && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ttfc-dim">Home banner</p>
          <div className="rounded-[22px] bg-[#8b52e0] px-4 py-3 text-sm font-semibold text-white">{title}</div>
        </div>
      )}
      {!d.notify && !d.feedPost && !d.banner && <p className="text-sm text-ttfc-muted">Choose where it goes to see a preview.</p>}
    </div>
  );
}

export default function ScheduledBroadcasts() {
  const toast = useToast();
  const list = useApi(SCHEDULED_PATH);
  const quiet = quietFrom(list.data?.quietHours);
  const [now, setNow] = useState(() => Date.now());
  const [d, setD] = useState(() => blankDraft(Date.now(), quiet));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(null); // { id, kind: "cancel" | "send" }
  const [busyId, setBusyId] = useState("");

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const set = (patch) => { setD((x) => ({ ...x, ...patch })); setErrors((e) => { const n = { ...e }; for (const k of Object.keys(patch)) delete n[k]; delete n.channels; return n; }); };
  const at = parseToronto(d.sendAt);
  const quietNow = d.notify && Number.isFinite(at) && inQuietHours(at, quiet);
  const items = sortItems(list.data?.items);

  const save = async (e) => {
    e.preventDefault();
    const found = checkDraft(d, Date.now(), quiet);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      if (d.id) await api.patch(`${SCHEDULED_PATH}/${encodeURIComponent(d.id)}`, bodyFrom(d));
      else await api.post(SCHEDULED_PATH, bodyFrom(d));
      toast.success(d.id ? "Saved the changes" : `Scheduled for ${whenET(at)}`);
      setD(blankDraft(Date.now(), quiet));
      list.reload();
    } catch (err) {
      if (err?.status === 409) toast.error("It isn't scheduled any more (sent, sending or cancelled), so it can't be changed.");
      else if (err?.data?.field) setErrors({ [err.data.field]: err.message });
      else toast.error(err);
    } finally { setSaving(false); }
  };

  const act = async (item, kind) => {
    setBusyId(item.id);
    try {
      await api.post(`${SCHEDULED_PATH}/${encodeURIComponent(item.id)}/${kind === "cancel" ? "cancel" : "send-now"}`);
      toast.success(kind === "cancel" ? "Cancelled: nothing will be sent" : "Sending now");
      if (d.id === item.id) setD(blankDraft(Date.now(), quiet));
      list.reload();
    } catch (err) {
      toast.error(err?.status === 409 ? "It isn't scheduled any more, so nothing changed." : err);
    } finally { setBusyId(""); setAsking(null); }
  };

  return (
    <div className="space-y-6">
      <Banner tone="info" icon={Moon} title={`Quiet hours: ${quietLabel(quiet)}`}>
        Phones aren't notified in the quiet hours, so notifications can't be scheduled then. A feed post or the Home banner alone can go at any time.
      </Banner>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card as="form" onSubmit={save} className="space-y-5" noValidate>
          <SectionTitle hint="Saved for later; nothing is sent until the time you pick.">{d.id ? "Edit the scheduled update" : "Schedule an update"}</SectionTitle>
          <div className="-mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Start from">
            <span className="text-xs text-ttfc-dim">Start from:</span>
            {TEMPLATES.map((t) => (
              <button key={t.key} type="button" onClick={() => set({ ...t.fill })}
                className={cx("rounded-lg border border-ttfc-line px-2.5 py-1 text-xs font-semibold text-ttfc-muted transition hover:border-ttfc-purple/60 hover:text-ttfc-text", focusRing)}>
                {t.label}
              </button>
            ))}
          </div>
          <Field label="When (Toronto time)" error={errors.sendAt} hint={Number.isFinite(at) ? whenET(at) : "Pick a date and time"}>
            {(id) => <Input id={id} type="datetime-local" value={d.sendAt} onChange={(e) => set({ sendAt: e.target.value })} aria-invalid={errors.sendAt ? true : undefined} />}
          </Field>
          {quietNow && !errors.sendAt && <p className="-mt-3 flex items-center gap-1.5 text-xs text-amber-200"><Moon className="h-3.5 w-3.5" aria-hidden="true" />That's in the quiet hours: pick another time, or turn the notification off.</p>}
          <Field label="Title" error={errors.title} hint={`${d.title.length}/${LIMITS.title}`}>
            {(id) => <Input id={id} value={d.title} maxLength={LIMITS.title} onChange={(e) => set({ title: e.target.value })} placeholder="Closing remarks at Centre Stage" />}
          </Field>
          <Field label="Message" error={errors.body} hint={`${d.body.length}/${LIMITS.body} characters · phones show about the first 150`}>
            {(id) => <Textarea id={id} rows={4} value={d.body} maxLength={LIMITS.body} onChange={(e) => set({ body: e.target.value })} placeholder="Join us at Centre Stage at 5:00 PM for the closing remarks." />}
          </Field>
          <Field label="Link (optional)" error={errors.linkUrl} hint="Opens when people tap it.">
            {(id) => (
              <div className="space-y-2">
                <Input id={id} value={d.linkUrl} maxLength={LIMITS.link} onChange={(e) => set({ linkUrl: e.target.value })} placeholder="https://… or ttfc://…" className="font-mono text-xs" />
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick picks">
                  {QUICK_LINKS.map((l) => (
                    <button key={l.label} type="button" aria-pressed={d.linkUrl.trim() === l.value} onClick={() => set({ linkUrl: l.value })}
                      className={cx("rounded-lg border px-2.5 py-1 text-xs font-semibold transition", d.linkUrl.trim() === l.value ? "border-ttfc-purple bg-ttfc-purple/15 text-ttfc-text" : "border-ttfc-line text-ttfc-muted hover:text-ttfc-text", focusRing)}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Field>
          <fieldset className="space-y-2.5">
            <legend className="mb-1.5 text-[13px] font-semibold text-ttfc-text/90">Where it goes</legend>
            <Check checked={d.feedPost} onChange={(v) => set({ feedPost: v })} icon={Newspaper} label="Post in the feed" hint="An official post at the top of the Feed." />
            <Check checked={d.banner} onChange={(v) => set({ banner: v })} icon={Home} label="Home banner" hint="Replaces the banner at the top of Home." />
            <Check checked={d.notify} onChange={(v) => set({ notify: v })} icon={BellRing} label="Notify app users" hint="A push and an in-app notification (not in the quiet hours)." />
            {d.notify && (
              <div className="ml-7 flex flex-wrap gap-2" role="radiogroup" aria-label="Who is notified">
                {AUDIENCES.map((a) => (
                  <label key={a.key} className={cx("inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm", d.audience === a.key ? "border-ttfc-purple bg-ttfc-purple/15" : "border-ttfc-line text-ttfc-muted")} title={a.hint || undefined}>
                    <input type="radio" name="sched-audience" value={a.key} checked={d.audience === a.key} onChange={() => set({ audience: a.key })} className="accent-ttfc-pink" />{a.label}
                  </label>
                ))}
              </div>
            )}
            {d.notify && AUDIENCES.find((a) => a.key === d.audience)?.hint && (
              <p className="ml-7 text-xs text-ttfc-muted">{AUDIENCES.find((a) => a.key === d.audience).hint}.</p>
            )}
            {errors.channels && <p role="alert" className="text-xs text-red-300">{errors.channels}</p>}
          </fieldset>
          <div className="flex flex-wrap gap-2 border-t border-ttfc-line pt-4">
            <Button type="submit" variant="primary" icon={d.id ? Save : CalendarClock} loading={saving}>{d.id ? "Save changes" : "Schedule"}</Button>
            {d.id && <Button icon={X} onClick={() => { setD(blankDraft(Date.now(), quiet)); setErrors({}); }}>Stop editing</Button>}
          </div>
        </Card>
        <Card className="h-fit"><SectionTitle>Preview</SectionTitle><Previews d={d} /></Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-3">
          <SectionTitle className="mb-0" hint="Times in Toronto. Edit, Cancel and Send now work while it's still scheduled.">Scheduled and sent</SectionTitle>
          <Button size="sm" icon={RefreshCw} className="ml-auto" onClick={list.reload}>Refresh</Button>
        </div>
        {list.loading ? <LoadingState label="Loading the scheduled updates…" /> : list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} title={list.error?.status === 404 ? "Not available yet: the server needs the latest backend update" : "Couldn't load the scheduled updates"} />
        ) : !items.length ? <EmptyState icon={Clock} title="Nothing scheduled yet" body="Updates you schedule appear here with their status." /> : (
          <ul className="divide-y divide-ttfc-line/70">
            {items.map((it) => {
              const st = STATUS[it.status] || { label: it.status || "—", tone: "neutral" };
              const live = it.status === "scheduled";
              const confirming = asking?.id === it.id ? asking.kind : "";
              const quietSend = it.notify && inQuietHours(now, quiet);
              return (
                <li key={it.id} className="py-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <b className="whitespace-nowrap">{whenET(it.sendAt)}</b>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {it.feedPost && <Badge icon={Newspaper}>Feed</Badge>}
                        {it.banner && <Badge icon={Home}>Banner</Badge>}
                        {it.notify && <Badge icon={BellRing}>{it.audience === "checkedIn" ? "Checked-in" : it.audience === "outdated" ? "Older app version" : "Everyone on the app"}</Badge>}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold">{it.title}</p>
                      <p className="line-clamp-2 text-sm text-ttfc-muted">{it.body}</p>
                      <p className="mt-1 text-xs text-ttfc-dim">
                        {[reachText(it), it.sentAt && it.status === "sent" ? `at ${whenET(it.sentAt)}` : "", it.createdByName ? `by ${it.createdByName}` : "", it.updatedByName && it.updatedByName !== it.createdByName ? `edited by ${it.updatedByName}` : ""].filter(Boolean).join(" · ")}
                      </p>
                      {it.error && (it.status === "failed" || it.status === "missed") && <p className="mt-1 text-xs text-red-300">{it.error}</p>}
                    </div>
                    {live && !confirming && (
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" icon={Pencil} onClick={() => { setD(draftFrom(it)); setErrors({}); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>
                        <Button size="sm" icon={X} onClick={() => setAsking({ id: it.id, kind: "cancel" })}>Cancel</Button>
                        <Button size="sm" icon={Send} disabled={quietSend} title={quietSend ? `Quiet hours (${quietLabel(quiet)}): phones aren't notified now` : "Send it now instead of at the scheduled time"} onClick={() => setAsking({ id: it.id, kind: "send" })}>Send now</Button>
                      </div>
                    )}
                  </div>
                  {confirming && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm" role="alert">
                      <span className="min-w-[200px] flex-1">
                        {confirming === "cancel" ? "Cancel this update? Nothing will be sent." : `Send it now${it.notify ? `: ${reachText(it) || "app users"} will be notified straight away` : ""}?`}
                      </span>
                      <Button size="sm" variant="danger" loading={busyId === it.id} icon={confirming === "cancel" ? X : Send} onClick={() => act(it, confirming)}>
                        {confirming === "cancel" ? "Yes, cancel it" : "Yes, send now"}
                      </Button>
                      <Button size="sm" onClick={() => setAsking(null)} disabled={busyId === it.id}>No</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Staff who aren't management see why the tab is empty. */
export function ScheduledLocked() {
  return (
    <Banner tone="info" icon={Lock} title="Management only">
      Scheduled updates to everyone are written and sent by management.
    </Banner>
  );
}
