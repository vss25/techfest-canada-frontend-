import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BellRing, Check, Clock, Inbox, Search, Send, UserRound, X } from "lucide-react";
import { ADMIN_API, api } from "../api";
import { useApi, useDebounced } from "../hooks";
import { useToast } from "../toastContext";
import { ago, initials, when } from "../format";
import {
  Badge, Banner, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, LoadingState, Select, SectionTitle,
  TableWrap, Textarea, focusRing,
} from "../ui";
import { SESSIONS, DAYS, formatTime12 } from "../../data/agenda";
import { BODY_MAX, LINK_CHOICES, MAX_RECIPIENTS, TITLE_MAX, buildLink, describeLink } from "./notifyLinks";

const ORIGIN = ADMIN_API.replace(/\/api\/?$/, "");
const fullName = (r) => r.name || r.email || "Someone";
const listNames = (rs) => {
  const names = rs.map(fullName);
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
};

function PersonAvatar({ r, size = "h-8 w-8" }) {
  const [broken, setBroken] = useState(false);
  if (r.avatarUrl && !broken) {
    return <img src={`${ORIGIN}${r.avatarUrl}`} alt="" onError={() => setBroken(true)} className={`${size} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span className={`${size} inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ttfc-pink to-ttfc-purple text-[11px] font-bold text-white`} aria-hidden="true">
      {initials(r.name, r.email)}
    </span>
  );
}

/* ---------- Recipient search with chips ---------- */
function RecipientPicker({ selected, onChange, error }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const dq = useDebounced(q.trim(), 250);
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const listId = useId();
  const { data, loading, error: loadError } = useApi(open ? `/console/notify/recipients${dq ? `?q=${encodeURIComponent(dq)}` : ""}` : null);
  const chosen = new Set(selected.map((r) => r.id));
  const results = (data?.recipients || []).filter((r) => !chosen.has(r.id));
  const full = selected.length >= MAX_RECIPIENTS;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const add = (r) => {
    if (full) return;
    onChange([...selected, r]);
    setQ(""); setActive(0);
    inputRef.current?.focus();
  };
  const remove = (id) => onChange(selected.filter((r) => r.id !== id));

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, Math.max(0, results.length - 1))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { if (open && results[active]) { e.preventDefault(); add(results[active]); } }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Backspace" && !q && selected.length) remove(selected[selected.length - 1].id);
  };

  return (
    <div ref={boxRef} className="relative">
      <div
        className={`flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border bg-ttfc-ink/70 px-2 py-1.5 transition focus-within:border-ttfc-purple focus-within:ring-2 focus-within:ring-ttfc-purple/30 ${error ? "border-red-400/60" : "border-ttfc-line"}`}
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((r) => (
          <span key={r.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-ttfc-purple/40 bg-ttfc-purple/15 py-0.5 pl-0.5 pr-1 text-[13px] font-semibold">
            <PersonAvatar r={r} size="h-6 w-6" />
            <span className="truncate">{fullName(r)}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(r.id); }} aria-label={`Remove ${fullName(r)}`}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-ttfc-muted hover:bg-white/10 hover:text-ttfc-text ${focusRing}`}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <div className="relative flex min-w-[180px] flex-1 items-center">
          {!selected.length && <Search className="pointer-events-none absolute left-1.5 h-4 w-4 text-ttfc-dim" aria-hidden="true" />}
          <input
            ref={inputRef}
            id="notify-recipients"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && results[active] ? `${listId}-${results[active].id}` : undefined}
            value={q}
            disabled={full}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
            placeholder={full ? `That's the maximum of ${MAX_RECIPIENTS}` : selected.length ? "Add someone else…" : "Search by name, email, company or job title"}
            className={`w-full bg-transparent py-1.5 text-sm text-ttfc-text placeholder:text-ttfc-dim focus:outline-none ${selected.length ? "px-1.5" : "pl-7 pr-1.5"}`}
          />
        </div>
      </div>

      {open && !full && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-2xl border border-ttfc-line bg-ttfc-panel2 shadow-2xl shadow-black/50">
          <p className="border-b border-ttfc-line px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ttfc-dim">
            {dq ? "People on the app" : "Recently active on the app"}
          </p>
          {loading ? <LoadingState label="Searching…" className="py-6" /> : loadError ? (
            <p className="px-3.5 py-4 text-sm text-red-300">{loadError.message}</p>
          ) : !results.length ? (
            <p className="px-3.5 py-4 text-sm text-ttfc-muted">
              {dq ? `No one on the app matches "${dq}". People only show up here once they've signed into the app.` : "Everyone listed is already added."}
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Matching people" className="max-h-72 overflow-y-auto py-1">
              {results.map((r, i) => (
                <li
                  key={r.id}
                  id={`${listId}-${r.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => { e.preventDefault(); add(r); }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 px-3.5 py-2.5 ${i === active ? "bg-white/[0.07]" : ""}`}
                >
                  <PersonAvatar r={r} size="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{fullName(r)}</p>
                    <p className="truncate text-xs text-ttfc-muted">{[r.jobTitle, r.company].filter(Boolean).join(" · ") || r.email}</p>
                  </div>
                  <span className="hidden shrink-0 text-[11px] text-ttfc-dim sm:block">active {ago(r.lastActiveAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Phone-style preview ---------- */
function PhonePreview({ title, body, opens }) {
  return (
    <div className="space-y-3 self-start lg:sticky lg:top-6">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ttfc-dim">On their phone</p>
      <div className="relative overflow-hidden rounded-[28px] border border-ttfc-line bg-[radial-gradient(120%_90%_at_20%_0%,#5b2a86_0%,#1d1033_45%,#0b0714_100%)] px-3.5 pb-5 pt-4">
        <p className="text-center text-[11px] font-semibold text-white/70">Monday 26 October</p>
        <p className="text-center text-4xl font-bold tracking-tight text-white/90">9:41</p>
        <div className="mt-4 rounded-[20px] bg-white/15 p-3 text-white shadow-lg shadow-black/30 backdrop-blur-md">
          <div className="flex items-start gap-2.5">
            <img src="/apple-touch-icon.png" alt="" className="h-9 w-9 shrink-0 rounded-[9px] bg-black" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[13px] font-semibold">{title || "Your title"}</p>
                <span className="shrink-0 text-[11px] text-white/60">now</span>
              </div>
              <p className="line-clamp-4 whitespace-pre-wrap break-words text-[13px] leading-snug text-white/85">
                {body || "Your message appears here."}
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ttfc-dim">In the app's notifications</p>
      <div className="flex items-start gap-3 rounded-2xl border border-ttfc-line bg-ttfc-panel2 p-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ttfc-pink to-ttfc-purple text-white">
          <BellRing className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{title || "Your title"}</p>
            <span className="h-2 w-2 shrink-0 rounded-full bg-ttfc-pink" aria-label="Unread" />
          </div>
          <p className="line-clamp-3 whitespace-pre-wrap break-words text-xs text-ttfc-muted">{body || "Your message appears here."}</p>
          <p className="mt-1 text-[11px] text-ttfc-dim">From the TTFC team · now · opens {opens}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Recently sent ---------- */
function ReadState({ rs }) {
  return (
    <ul className="space-y-1">
      {rs.map((r) => (
        <li key={r.id} className="flex items-center gap-2 whitespace-nowrap">
          <span className="font-semibold">{r.name}</span>
          {r.readAt ? <Badge tone="good" icon={Check}>Read</Badge> : <Badge>Unread</Badge>}
        </li>
      ))}
    </ul>
  );
}

function RecentlySent({ reloadKey, sessions }) {
  // reloadKey changes after each send, which refetches straight away.
  const { data, error, loading, reload } = useApi(`/console/notify/history?limit=30&v=${reloadKey}`, { interval: 30000 });
  const sends = data?.sends || [];
  return (
    <section className="mt-8" aria-labelledby="recent-notify">
      <SectionTitle hint="Read means they opened it in the app. Updates every 30 seconds.">
        <span id="recent-notify">Recently sent</span>
      </SectionTitle>
      {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !sends.length ? (
        <EmptyState icon={Inbox} title="Nothing sent yet" body="Personal notifications you send show up here with whether they've been read." />
      ) : (
        <TableWrap>
          <thead><tr><th>When</th><th>To</th><th>Notification</th><th>Opens</th><th>Sent by</th></tr></thead>
          <tbody>
            {sends.map((s) => (
              <tr key={s.id}>
                <td className="whitespace-nowrap text-ttfc-muted">{when(s.createdAt)}</td>
                <td>
                  {s.total <= 4 ? <ReadState rs={s.recipients} /> : (
                    <details>
                      <summary className="cursor-pointer whitespace-nowrap font-semibold">
                        {s.total} people · <span className="text-ttfc-muted">{s.readCount} read</span>
                      </summary>
                      <div className="mt-2"><ReadState rs={s.recipients} /></div>
                    </details>
                  )}
                </td>
                <td className="min-w-[16rem] max-w-md">
                  <p className="font-semibold">{s.title}</p>
                  <p className="line-clamp-2 text-xs text-ttfc-muted">{s.body}</p>
                </td>
                <td className="max-w-[14rem] text-ttfc-muted"><p className="line-clamp-2" title={s.link}>{describeLink(s.link, sessions)}</p></td>
                <td className="whitespace-nowrap text-ttfc-muted">{s.sentByName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </section>
  );
}

/* ---------- The composer ---------- */
export default function PersonalNotify({ prefillIds = [] }) {
  const toast = useToast();
  const [to, setTo] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [choice, setChoice] = useState("home");
  const [sessionId, setSessionId] = useState("");
  const [url, setUrl] = useState("");
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  // Agenda sessions for "A session…": the live CMS list if staff can load it, else the website's built-in agenda.
  const cms = useApi(choice === "session" ? "/cms/session" : null);
  const sessions = useMemo(() => {
    const live = Array.isArray(cms.data) ? cms.data.filter((s) => s.title && (s.sessionId || s._id) && !s.isBreak)
      .map((s) => ({ id: s.sessionId || s._id, title: s.title, day: Number(s.day) || 0, time: s.time || "" })) : [];
    const list = live.length ? live : SESSIONS.filter((s) => !s.isBreak).map((s) => ({ id: s.id, title: s.title, day: s.day, time: s.time }));
    return list.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  }, [cms.data]);

  // Pre-filled from a person's page (?to=<id>).
  const prefillKey = prefillIds.join(",");
  const prefill = useApi(prefillKey ? `/console/notify/recipients?ids=${encodeURIComponent(prefillKey)}` : null);
  const [prefillDone, setPrefillDone] = useState("");
  if (prefill.data && prefillDone !== prefillKey) {
    setPrefillDone(prefillKey);
    const found = prefill.data.recipients || [];
    setTo((cur) => [...cur, ...found.filter((r) => !cur.some((c) => c.id === r.id))]);
  }
  const notOnApp = prefill.data && prefillIds.length > (prefill.data.recipients || []).length;

  const linkResult = buildLink({ choice, sessionId, url });
  const opens = choice === "session"
    ? (sessions.find((s) => s.id === sessionId)?.title ? `the session "${sessions.find((s) => s.id === sessionId).title}"` : "a session")
    : choice === "web" ? (url ? describeLink(url) : "a web page") : LINK_CHOICES.find((c) => c.key === choice)?.label || "Home";

  const review = (e) => {
    e.preventDefault();
    const next = {};
    if (!to.length) next.to = "Pick at least one person.";
    if (!title.trim()) next.title = "Add a short title.";
    if (!body.trim()) next.body = "Write the message.";
    if (linkResult.error) next.link = linkResult.error;
    setErrors(next);
    if (!Object.keys(next).length) setConfirm(true);
  };

  const send = async () => {
    const r = await api.post("/console/notify", { userIds: to.map((x) => x.id), title: title.trim(), body: body.trim(), link: linkResult.link });
    const names = to.filter((x) => !(r.skipped || []).includes(x.id));
    toast.success(`Sent to ${listNames(names)}`);
    if (r.skipped?.length) toast.info(`${r.skipped.length} ${r.skipped.length === 1 ? "person isn't" : "people aren't"} on the app, so they were skipped.`);
    setTo([]); setTitle(""); setBody(""); setChoice("home"); setSessionId(""); setUrl(""); setErrors({});
    setSentCount((n) => n + 1);
  };

  const confirmTitle = to.length === 1 ? `Send to ${fullName(to[0])}?` : `Send to ${to.length} people?`;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card as="form" onSubmit={review} className="space-y-5" noValidate>
          <SectionTitle hint="A private notification for one person, or a few. Only they see it.">Send to a person</SectionTitle>
          {notOnApp && (
            <Banner tone="warn" title="Not on the app yet">
              {prefillIds.length === 1 ? "This person hasn't" : "Some of these people haven't"} signed into the app, so they can't get app notifications. Email them instead.
            </Banner>
          )}
          <Field label="To" required error={errors.to} id="notify-recipients"
            hint={`${to.length ? `${to.length} selected · ` : ""}Only people who have signed into the app can be picked (up to ${MAX_RECIPIENTS}).`}>
            <RecipientPicker selected={to} onChange={(v) => { setTo(v); setErrors((x) => ({ ...x, to: "" })); }} error={errors.to} />
          </Field>
          <Field label="Title" required error={errors.title} hint={`${title.length}/${TITLE_MAX} characters · shown in bold on the lock screen`}>
            {(id) => <Input id={id} value={title} maxLength={TITLE_MAX} onChange={(e) => { setTitle(e.target.value); setErrors((x) => ({ ...x, title: "" })); }} placeholder="Your speaker green room is ready" />}
          </Field>
          <Field label="Message" required error={errors.body} hint={`${body.length}/${BODY_MAX} characters · phones show the first few lines`}>
            {(id) => (
              <Textarea id={id} rows={4} value={body} maxLength={BODY_MAX} onChange={(e) => { setBody(e.target.value); setErrors((x) => ({ ...x, body: "" })); }}
                placeholder="Hi Priya, the speaker lounge on the Mezzanine is open from 7:30 AM. Grab a coffee before your panel." />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="When they tap it, open…">
              {(id) => (
                <Select id={id} value={choice} onChange={(e) => { setChoice(e.target.value); setErrors((x) => ({ ...x, link: "" })); }}>
                  {LINK_CHOICES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </Select>
              )}
            </Field>
            {choice === "session" && (
              <Field label="Session" error={errors.link}>
                {(id) => (
                  <Select id={id} value={sessionId} onChange={(e) => { setSessionId(e.target.value); setErrors((x) => ({ ...x, link: "" })); }}>
                    <option value="">Pick a session…</option>
                    {[1, 2].map((d) => (
                      <optgroup key={d} label={`${DAYS[d].label} · ${DAYS[d].date}`}>
                        {sessions.filter((s) => s.day === d).map((s) => (
                          <option key={s.id} value={s.id}>{s.time ? `${formatTime12(s.time)} · ` : ""}{s.title}</option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                )}
              </Field>
            )}
            {choice === "web" && (
              <Field label="Web address" error={errors.link}>
                {(id) => <Input id={id} type="url" inputMode="url" value={url} onChange={(e) => { setUrl(e.target.value); setErrors((x) => ({ ...x, link: "" })); }} placeholder="https://thetechfestival.com/agenda" />}
              </Field>
            )}
          </div>
          <p className="flex items-start gap-2 rounded-2xl border border-ttfc-line bg-ttfc-ink/40 p-3.5 text-[13px] leading-relaxed text-ttfc-muted">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ttfc-orange" aria-hidden="true" />
            <span>They'll see it in the app's notifications and as a phone notification: right away once push is switched on on the server, otherwise the next time the app checks in.</span>
          </p>
          <div className="flex justify-end">
            <Button variant="primary" type="submit" icon={Send}>Review & send</Button>
          </div>
        </Card>
        <PhonePreview title={title.trim()} body={body.trim()} opens={opens} />
      </div>

      <RecentlySent reloadKey={sentCount} sessions={sessions} />

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        tone="primary"
        title={confirmTitle}
        body={to.length === 1 ? "Only they will see it. It can't be unsent." : `Each of them gets their own private copy: ${listNames(to)}. It can't be unsent.`}
        confirmLabel="Send now"
        onConfirm={send}
      >
        <div className="rounded-xl border border-ttfc-line bg-ttfc-ink/60 p-3 text-sm">
          <p className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4 text-ttfc-pink" aria-hidden="true" />{title.trim()}</p>
          <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-ttfc-muted">{body.trim()}</p>
          <p className="mt-2 text-xs text-ttfc-dim">Opens {opens}</p>
        </div>
      </ConfirmDialog>
    </>
  );
}
