import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Link2, PenLine, RotateCcw, Send, Settings2, Sparkles, Trash2 } from "lucide-react";
import { useApi } from "../hooks";
import { adminFetch } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Card, Drawer, EmptyState, ErrorState, Field, Input, LoadingState, ManagementOnly, PageHeader, Select, Switch, Textarea,
} from "../ui";

/* =========================================================
   Admin › Marketing › LinkedIn posts for my profile (Nov 22 2026). Management only; everyone sees only their own.
   Claude researches current news (Canada's 5 pillars and 5 sectors, government policy and relationships, what
   policy means for the market and the world, geopolitics), writes posts in the person's voice with real sources,
   fact-checks them, and takes every em-dash out. Each post lightly invites sponsors, speakers and exhibitors to an
   event. The person edits a draft, then posts it to their own LinkedIn or copies it. API: /api/console/linkedin-posts.
========================================================= */

const API = "/console/linkedin-posts";

const POST_ERRORS = {
  cancelled: "You cancelled on LinkedIn. Nothing was posted.",
  denied: "LinkedIn didn't give permission, so nothing was posted.",
  expired: "That took too long. Press Post to LinkedIn again.",
  unavailable: "Posting from here isn't available right now. Use Copy instead.",
  failed: "LinkedIn didn't take the post. Try again, or use Copy.",
};

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* older browsers */ }
  try {
    const t = document.createElement("textarea");
    t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(t);
    return ok;
  } catch { return false; }
}

function Checks({ label, options, value, onChange, hint }) {
  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-[13px] font-semibold text-[#151035]">{label}</legend>
      {options.map((o) => (
        <label key={o.key} className="flex cursor-pointer items-start gap-2 text-sm text-[#151035]">
          <input type="checkbox" className="mt-[3px] h-4 w-4 shrink-0 accent-[#D6308C]" checked={value.includes(o.key)} onChange={() => toggle(o.key)} />
          <span>{o.label}{o.hint && <span className="block text-xs text-[#8A86A0]">{o.hint}</span>}</span>
        </label>
      ))}
      {hint && <p className="text-[11px] leading-4 text-[#8A86A0]">{hint}</p>}
    </fieldset>
  );
}

/* ---------------- My voice and topics ---------------- */
function SettingsDrawer({ open, onClose, data, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(data.settings);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const o = data.options;
  const save = async () => {
    setBusy(true);
    try {
      const r = await adminFetch(`${API}/settings`, { method: "PUT", body: form });
      onSaved(r.settings);
      toast.success("Saved. Your next drafts will use these.");
      onClose();
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  const asList = (arr) => arr.map((x) => ({ key: x, label: x }));
  return (
    <Drawer open={open} onClose={onClose} title="My voice and topics" description="Only you see these. They make your posts sound like you and keep them different from your colleagues'."
      footer={<div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></div>}>
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name">{(id) => <Input id={id} value={form.displayName} onChange={(e) => set("displayName")(e.target.value)} />}</Field>
          <Field label="Your role">{(id) => <Input id={id} value={form.role} placeholder="Co-founder, TTFC" onChange={(e) => set("role")(e.target.value)} />}</Field>
        </div>
        <Field label="About you" hint="A few lines in your own words: your background, what you care about, how you like to write. Optional but it helps a lot.">
          {(id) => <Textarea id={id} rows={4} value={form.about} onChange={(e) => set("about")(e.target.value)} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Voice">{(id) => <Select id={id} value={form.voice} onChange={(e) => set("voice")(e.target.value)}>{o.voices.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}</Select>}</Field>
          <Field label="Length">{(id) => <Select id={id} value={form.length} onChange={(e) => set("length")(e.target.value)}>{o.lengths.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}</Select>}</Field>
        </div>
        <Checks label="Write about" options={o.topics} value={form.topics} onChange={set("topics")} />
        <Checks label="Pillars to focus on" options={asList(o.pillars)} value={form.pillars} onChange={set("pillars")} hint="Leave all unticked for any of the five." />
        <Checks label="Sectors to focus on" options={asList(o.sectors)} value={form.sectors} onChange={set("sectors")} hint="Leave all unticked for any of the five." />
        <Checks label="Who the posts invite" options={o.inviteWho} value={form.inviteWho} onChange={set("inviteWho")} hint="The invitation is one light line near the end, never a sales pitch." />
        <Field label="Which event to mention">{(id) => <Select id={id} value={form.inviteEvent} onChange={(e) => set("inviteEvent")(e.target.value)}>{o.inviteEvent.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}</Select>}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hashtags">{(id) => <Select id={id} value={String(form.hashtags)} onChange={(e) => set("hashtags")(Number(e.target.value))}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? "None" : n}</option>)}</Select>}</Field>
          <Field label="Drafts each time">{(id) => <Select id={id} value={String(form.count)} onChange={(e) => set("count")(Number(e.target.value))}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</Select>}</Field>
        </div>
        <Switch label="Add the sources at the end of the post" description="The links to where the facts come from. You can always see them below each draft." checked={form.sourcesInPost} onChange={set("sourcesInPost")} />
        <Switch label="Use emoji" description="One or two, only where natural." checked={form.emoji} onChange={set("emoji")} />
        <Field label="Spelling">{(id) => <Select id={id} value={form.spelling} onChange={(e) => set("spelling")(e.target.value)}>{["Canadian", "American", "British"].map((v) => <option key={v} value={v}>{v} English</option>)}</Select>}</Field>
        <Field label="Words to avoid" hint="Separate with commas.">{(id) => <Input id={id} value={form.avoid} onChange={(e) => set("avoid")(e.target.value)} />}</Field>
        <Field label="Anything else" hint="For example: mention our Vancouver community, keep it upbeat, no politics.">{(id) => <Textarea id={id} rows={3} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />}</Field>
      </div>
    </Drawer>
  );
}

/* ---------------- One draft ---------------- */
function DraftCard({ draft, linkedin, postMax, onChange, onRemoved }) {
  const toast = useToast();
  const [text, setText] = useState(draft.text);
  const [busy, setBusy] = useState("");
  const [showPosted, setShowPosted] = useState(false);
  const [postUrl, setPostUrl] = useState("");
  const savedText = useRef(draft.text);
  useEffect(() => { setText(draft.text); savedText.current = draft.text; }, [draft.text]);

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (err) { toast.error(err); } finally { setBusy(""); }
  };
  const saveText = async () => {
    if (text === savedText.current) return true;
    if (!text.trim()) { toast.error("The post is empty."); return false; }
    const r = await adminFetch(`${API}/drafts/${draft.id}`, { method: "PATCH", body: { text } });
    savedText.current = r.draft.text;
    onChange(r.draft);
    return true;
  };
  const copy = (openLinkedin) => run(openLinkedin ? "open" : "copy", async () => {
    if (!(await saveText())) return;
    const ok = await copyText(text);
    if (!ok) { toast.error("Couldn't copy. Select the text and copy it yourself."); return; }
    const r = await adminFetch(`${API}/drafts/${draft.id}/copied`, { method: "POST", body: {} });
    onChange(r.draft);
    if (openLinkedin) {
      window.open(r.draft.shareUrl, "_blank", "noopener");
      toast.success("Copied. LinkedIn is open with the post filled in. If it's empty there, paste it.");
    } else toast.success("Copied. Paste it into LinkedIn and change anything you like.");
  });
  const post = () => run("post", async () => {
    if (text.length > postMax) { toast.error(`LinkedIn takes up to ${postMax.toLocaleString("en-CA")} characters.`); return; }
    const r = await adminFetch(`${API}/drafts/${draft.id}/linkedin`, { method: "POST", body: { text, returnTo: window.location.href } });
    window.location.assign(r.url);
  });
  const reset = () => run("reset", async () => {
    const r = await adminFetch(`${API}/drafts/${draft.id}/reset`, { method: "POST", body: {} });
    onChange(r.draft);
  });
  const markPosted = (posted) => run("posted", async () => {
    const r = await adminFetch(`${API}/drafts/${draft.id}/posted`, { method: "POST", body: posted ? { posted: true, url: postUrl.trim() } : { posted: false } });
    onChange(r.draft); setShowPosted(false); setPostUrl("");
  });
  const remove = () => run("remove", async () => {
    await adminFetch(`${API}/drafts/${draft.id}/dismiss`, { method: "POST", body: {} });
    onRemoved(draft.id);
    toast.success("Removed.");
  });

  const posted = draft.status === "posted";
  const over = text.length > postMax;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[15px] font-semibold leading-snug text-[#151035]">{draft.headline || "Draft"}</h3>
        <div className="flex flex-wrap gap-1.5">
          {draft.topicLabel && <Badge tone="purple">{draft.topicLabel}</Badge>}
          {draft.event?.name && <Badge tone="neutral">Invites to {draft.event.name}{draft.event.when ? ` · ${draft.event.when}` : ""}</Badge>}
          {draft.check && <Badge tone="good" icon={Check}>{draft.check.verdict === "fixed" ? "Fact-checked and corrected" : "Fact-checked"}</Badge>}
          {posted && <Badge tone="pink">Posted</Badge>}
          {!posted && draft.status === "copied" && <Badge tone="warn">Copied</Badge>}
          {draft.edited && !posted && <Badge tone="neutral">Edited by you</Badge>}
        </div>
      </div>

      <Field label="Your post" hint={`${text.length.toLocaleString("en-CA")} of ${postMax.toLocaleString("en-CA")} characters${over ? ". Too long for LinkedIn." : ""}`} error={over ? `LinkedIn takes up to ${postMax.toLocaleString("en-CA")} characters.` : undefined}>
        {(id) => <Textarea id={id} rows={10} value={text} disabled={posted} onChange={(e) => setText(e.target.value)} onBlur={() => saveText().catch((err) => toast.error(err))} />}
      </Field>

      {draft.sources.length > 0 && (
        <div className="rounded-[10px] border border-[#F0EEF6] bg-[#FBFAFE] p-3">
          <p className="mb-1.5 text-[13px] font-semibold text-[#151035]">Sources Claude checked</p>
          <ul className="flex flex-col gap-1.5">
            {draft.sources.map((s) => (
              <li key={s.url} className="text-[13px] leading-snug">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 break-all font-medium text-[#9D1D63] underline underline-offset-2">
                  <ExternalLink className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden="true" />{s.title || s.url}
                </a>
                {s.supports && <span className="block text-xs text-[#6B6688]">{s.supports}</span>}
              </li>
            ))}
          </ul>
          {draft.check?.notes && <p className="mt-2 text-xs text-[#6B6688]">Check notes: {draft.check.notes}</p>}
        </div>
      )}

      {posted ? (
        <div className="flex flex-wrap items-center gap-2">
          {draft.postUrl
            ? <a href={draft.postUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9D1D63] underline underline-offset-2"><ExternalLink className="h-4 w-4" aria-hidden="true" />See it on LinkedIn</a>
            : <span className="text-sm text-[#6B6688]">Posted{draft.postedAt ? ` on ${new Date(draft.postedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}` : ""}.</span>}
          {draft.postedVia === "by hand" && <Button size="sm" variant="ghost" loading={busy === "posted"} onClick={() => markPosted(false)}>Not posted after all</Button>}
          <Button size="sm" icon={Copy} loading={busy === "copy"} onClick={() => copy(false)}>Copy</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {linkedin && <Button variant="primary" icon={Send} loading={busy === "post"} disabled={over || !!busy} onClick={post}>Post to my LinkedIn</Button>}
            <Button icon={Copy} loading={busy === "copy"} disabled={!!busy} onClick={() => copy(false)}>Copy</Button>
            <Button icon={ExternalLink} loading={busy === "open"} disabled={!!busy} onClick={() => copy(true)}>Copy and open LinkedIn</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {draft.edited && <Button size="sm" variant="ghost" icon={RotateCcw} loading={busy === "reset"} onClick={reset}>Undo my edits</Button>}
            <Button size="sm" variant="ghost" icon={Link2} onClick={() => setShowPosted((v) => !v)}>I posted it myself</Button>
            <Button size="sm" variant="ghost" icon={Trash2} loading={busy === "remove"} onClick={remove}>Remove</Button>
          </div>
          {showPosted && (
            <div className="flex flex-col gap-2 rounded-[10px] border border-[#F0EEF6] p-3 sm:flex-row sm:items-end">
              <Field className="flex-1" label="Link to your post (optional)">{(id) => <Input id={id} placeholder="https://www.linkedin.com/…" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} />}</Field>
              <Button variant="primary" loading={busy === "posted"} onClick={() => markPosted(true)}>Mark as posted</Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ---------------- The page ---------------- */
function Page() {
  const toast = useToast();
  const [poll, setPoll] = useState(false);
  const me = useApi(`${API}/me`, { interval: poll ? 5000 : undefined });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  const data = me.data;
  const state = data?.run?.state;
  useEffect(() => { setPoll(state === "working"); }, [state]);

  // Back from LinkedIn: #posted=<id>&post=<url> or #post_error=<code>&d=<id>.
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    if (h.has("posted")) toast.success("Posted to your LinkedIn.");
    else if (h.has("post_error")) toast.error(POST_ERRORS[h.get("post_error")] || POST_ERRORS.failed);
    else return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [toast]);

  if (me.error && !data) return <ErrorState error={me.error} onRetry={me.reload} />;
  if (!data) return <LoadingState label="Loading your drafts…" />;

  const write = async () => {
    setWriting(true);
    try {
      const r = await adminFetch(`${API}/write`, { method: "POST", body: {} });
      me.setData((d) => ({ ...d, run: r.run, rounds: r.rounds }));
      setPoll(true);
    } catch (err) { toast.error(err); } finally { setWriting(false); }
  };
  const replace = (draft) => me.setData((d) => ({ ...d, drafts: d.drafts.map((x) => (x.id === draft.id ? draft : x)) }));
  const removed = (id) => me.setData((d) => ({ ...d, drafts: d.drafts.filter((x) => x.id !== id) }));

  const open = data.drafts.filter((d) => d.status !== "posted");
  const done = data.drafts.filter((d) => d.status === "posted");
  const working = state === "working";
  const cantWrite = !data.writing || working || data.rounds.left <= 0 || data.budget.left <= 0;

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-4">
      <PageHeader
        title="LinkedIn posts for my profile"
        description="Claude looks up current news on Canadian tech, policy and world events, writes posts in your voice with their sources, and fact-checks them. Each post lightly invites sponsors, speakers and exhibitors to one of our events. Edit a draft, then post it to your LinkedIn or copy it."
        actions={<>
          <Button icon={Settings2} onClick={() => setSettingsOpen(true)}>My voice and topics</Button>
          <Button variant="primary" icon={Sparkles} loading={writing} disabled={cantWrite} onClick={write}>Write new drafts</Button>
        </>}
      />

      {!data.writing && <Banner tone="warn" title="Writing isn't set up yet">The server needs its Anthropic API key. Ask the developers.</Banner>}
      {data.writing && data.budget.left <= 0 && <Banner tone="warn" title="This month's writing limit is used up">It can be raised in Marketing › Social posts › Settings.</Banner>}
      {data.writing && data.rounds.left <= 0 && !working && <Banner tone="info" title="That's all for today">You can write new drafts {data.rounds.max} times a day. Try again tomorrow.</Banner>}
      {!data.saved && !working && (
        <Banner tone="info" icon={PenLine} title="Make them sound like you" action={<Button size="sm" onClick={() => setSettingsOpen(true)}>Set it up</Button>}>
          Add a few lines about yourself and pick your voice and topics. It takes a minute and makes your posts different from everyone else's.
        </Banner>
      )}
      {working && (
        <Banner tone="info" title="Claude is researching and checking your drafts">
          This takes 2 to 4 minutes. You can leave this page; your drafts will be waiting here.
        </Banner>
      )}
      {state === "done" && data.run.made > 0 && (
        <Banner tone="good" title={`${data.run.made} new ${data.run.made === 1 ? "draft" : "drafts"} ready`}>
          {data.run.dropped.length > 0 && <>Claude left out {data.run.dropped.length} that couldn't be fully sourced, didn't pass the check or were too close to a colleague's post.</>}
        </Banner>
      )}
      {(state === "failed" || (state === "done" && data.run.made === 0)) && data.run.error && (
        <Banner tone={state === "failed" ? "danger" : "warn"} title={state === "failed" ? "That didn't work" : "No new drafts this time"}>{data.run.error}</Banner>
      )}

      {open.length === 0 && !working ? (
        <EmptyState icon={Sparkles} title="No drafts yet" body="Press Write new drafts. Claude will have a few ready in a couple of minutes."
          action={data.writing ? <Button variant="primary" icon={Sparkles} loading={writing} disabled={cantWrite} onClick={write}>Write new drafts</Button> : null} />
      ) : (
        open.map((d) => <DraftCard key={d.id} draft={d} linkedin={data.linkedin} postMax={data.postMax} onChange={replace} onRemoved={removed} />)
      )}

      {done.length > 0 && (
        <details className="rounded-xl border border-[#E3E0EE] bg-white p-[18px]">
          <summary className="cursor-pointer text-sm font-semibold text-[#151035]">Posted ({done.length})</summary>
          <div className="mt-3 flex flex-col gap-3">
            {done.map((d) => <DraftCard key={d.id} draft={d} linkedin={data.linkedin} postMax={data.postMax} onChange={replace} onRemoved={removed} />)}
          </div>
        </details>
      )}

      <p className="text-xs text-[#8A86A0]">
        Only you see your drafts. Always read a post before it goes out: you're the author. {data.rounds.left} of {data.rounds.max} writing rounds left today.
      </p>

      {settingsOpen && <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} data={data} onSaved={(settings) => me.setData((d) => ({ ...d, settings, saved: true }))} />}
    </div>
  );
}

export default function LinkedinPosts() {
  return <ManagementOnly><Page /></ManagementOnly>;
}
