import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Flag, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { useAdminEvent } from "../eventContext";
import {
  Badge, Banner, Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, Modal, PageHeader, Select, Tabs, Textarea, focusRing,
} from "../ui";

/* Today › My work (Nov 20 2026): every promise is a task with an owner and a due date, so people
   can see who is doing what without asking, and raise a flag when something is wrong.
   Kept simple on purpose (the team isn't technical): three fields to add a task (what, who,
   by when), plain words, one list in the order things need attention. API: /console/commitments. */

const GROUPS = [
  ["flagged", "Needs help", "Someone raised a flag on these."],
  ["overdue", "Overdue", "The date has passed."],
  ["today", "Due today", ""],
  ["soon", "Due in the next 7 days", ""],
  ["later", "Later", ""],
  ["someday", "No date yet", "Give these a date so they aren't forgotten."],
  ["done", "Done", ""],
];
const prettyDay = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }) : "");
const eventKeyOf = (ev) => ev?.eventKey?.current || ev?.eventKey || "";

function TaskFields({ form, setForm, data, events, autoFocus }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="What needs doing?" required className="sm:col-span-2">
        {(id) => <Input id={id} value={form.title} onChange={set("title")} maxLength={200} placeholder="e.g. Send the signed MOU to Northline Robotics" data-autofocus={autoFocus || undefined} />}
      </Field>
      <Field label="Who will do it?">
        {(id) => (
          <Select id={id} value={form.ownerId} onChange={set("ownerId")}>
            {(data?.people || []).map((p) => <option key={p.id} value={p.id}>{p.id === data.me ? `Me (${p.name})` : p.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label="By when?" hint="Leave empty if there's no date yet.">
        {(id) => <Input id={id} type="date" value={form.dueDate} onChange={set("dueDate")} />}
      </Field>
      <Field label="Who is it about?" hint="Optional. The partner, speaker or vendor.">
        {(id) => <Input id={id} value={form.about} onChange={set("about")} maxLength={160} placeholder="e.g. Northline Robotics" />}
      </Field>
      <Field label="Area">
        {(id) => (
          <Select id={id} value={form.area} onChange={set("area")}>
            {(data?.areas || []).map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Event" className="sm:col-span-2">
        {(id) => (
          <Select id={id} value={form.eventKey} onChange={set("eventKey")}>
            <option value="">Not about one event</option>
            {events.map((e) => <option key={e._id} value={eventKeyOf(e)}>{e.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label="Notes" hint="Optional. Anything the person doing it should know." className="sm:col-span-2">
        {(id) => <Textarea id={id} rows={3} value={form.notes} onChange={set("notes")} maxLength={2000} />}
      </Field>
    </div>
  );
}

function FlagModal({ item, data, eventKey, onClose, onSaved }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [severity, setSeverity] = useState("at_risk");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!note.trim()) { toast.error("Say what's wrong, in a sentence."); return; }
    setBusy(true);
    try {
      const out = item ? await api.post(`/console/commitments/${item.id}/flag`, { note, severity })
        : await api.post("/console/commitments/flag", { note, severity, eventKey });
      toast.success("Flag raised. Your managers have been emailed.");
      onSaved(out.item);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} title="Raise a flag"
      description={item ? `About: ${item.title}` : "Use this when something is wrong or stuck and you need help. Your managers are emailed straight away."}
      footer={<><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" icon={Flag} loading={busy} onClick={send}>Raise the flag</Button></>}>
      <div className="space-y-4">
        <Field label="What's wrong?" required hint="One or two sentences is enough.">
          {(id) => <Textarea id={id} rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} data-autofocus placeholder="e.g. The venue hasn't sent the contract and the deposit is due Friday." />}
        </Field>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">How serious is it?</legend>
          {(data?.severities || []).map((s) => (
            <label key={s.key} className="flex items-start gap-2 text-sm">
              <input type="radio" name="severity" className="mt-1 h-4 w-4 accent-ttfc-pink" checked={severity === s.key} onChange={() => setSeverity(s.key)} />
              {s.label}
            </label>
          ))}
        </fieldset>
      </div>
    </Modal>
  );
}

function ResolveModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim()) { toast.error("Say how it was sorted out, in a sentence."); return; }
    setBusy(true);
    try { const out = await api.post(`/console/commitments/${item.id}/flag/resolve`, { resolution: text }); toast.success("Flag resolved."); onSaved(out.item); }
    catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} title="Resolve this flag" description={`${item.flag.raisedByName} said: “${item.flag.note}”`}
      footer={<><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={send}>Mark resolved</Button></>}>
      <Field label="How was it sorted out?" required>
        {(id) => <Textarea id={id} rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} data-autofocus />}
      </Field>
    </Modal>
  );
}

function EditModal({ item, data, events, onClose, onSaved, onDeleted }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: item.title, ownerId: item.ownerId || data.me, dueDate: item.dueDate, about: item.about, area: item.area, eventKey: item.eventKey, notes: item.notes });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { const out = await api.patch(`/console/commitments/${item.id}`, form); toast.success("Saved."); onSaved(out.item); }
    catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm("Delete this task? If it's finished, mark it done instead so there's a record.")) return;
    setBusy(true);
    try { await api.del(`/console/commitments/${item.id}`); toast.success("Deleted."); onDeleted(item.id); }
    catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  return (
    <Modal open size="lg" onClose={() => { if (!busy) onClose(); }} title="Edit task"
      footer={<><Button variant="dangerOutline" icon={Trash2} onClick={remove} disabled={busy}>Delete</Button><span className="flex-1" /><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <TaskFields form={form} setForm={setForm} data={data} events={events} autoFocus />
    </Modal>
  );
}

function Row({ item, me, onDone, onFlag, onResolve, onEdit }) {
  const done = item.status === "done";
  const tone = item.state === "overdue" ? "text-[#B91C1C]" : "text-[#6B6688]";
  return (
    <li className="flex items-start gap-3 border-t border-[#F0EEF6] px-1 py-3 first:border-t-0">
      <button type="button" onClick={() => onDone(item, !done)} aria-label={done ? `Mark “${item.title}” not done` : `Mark “${item.title}” done`} title={done ? "Mark not done" : "Mark done"}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-[#166534] bg-[#166534] text-white" : "border-[#C9C4D9] bg-white text-transparent hover:border-[#166534] hover:text-[#166534]"} ${focusRing}`}>
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-semibold text-[#151035] ${done ? "line-through opacity-60" : ""}`}>{item.title}</p>
        <p className={`mt-0.5 text-[13px] ${tone}`}>
          {item.ownerName ? (item.ownerId === me ? "You" : item.ownerName) : <strong className="text-[#B45309]">Nobody yet</strong>}
          {item.dueDate ? ` · ${item.state === "overdue" ? "was due" : "due"} ${prettyDay(item.dueDate)}` : " · no date"}
          {item.about ? ` · ${item.about}` : ""}
          {done && item.doneByName ? ` · done by ${item.doneByName}` : ""}
        </p>
        {item.flag?.open && (
          <p className="mt-1.5 rounded-lg bg-[#FEF2F2] px-2.5 py-1.5 text-[13px] text-[#991B1B]">
            <strong>{item.flag.severity === "blocked" ? "Blocked" : "At risk"}:</strong> {item.flag.note} <span className="opacity-70">({item.flag.raisedByName})</span>
          </p>
        )}
        {item.flag && !item.flag.open && item.flag.resolution && (
          <p className="mt-1 text-[13px] text-[#166534]">Flag resolved by {item.flag.resolvedByName}: {item.flag.resolution}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {item.flag?.open ? <Button size="sm" onClick={() => onResolve(item)}>Resolve flag</Button>
          : !done && <Button size="sm" variant="ghost" icon={Flag} onClick={() => onFlag(item)}>Flag</Button>}
        {done ? <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => onDone(item, false)}>Reopen</Button>
          : <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(item)}>Edit</Button>}
      </div>
    </li>
  );
}

export default function MyWork() {
  const toast = useToast();
  const { current: chosenEvent, events } = useAdminEvent();
  const [tab, setTab] = useState(() => (new URLSearchParams(window.location.search).get("tab") === "flags" ? "flags" : "mine"));
  // Private: staff see their own tasks, the ones they gave to someone and flags they raised; managers see everyone's.
  const query = tab === "done" ? "scope=all&status=done" : tab === "mine" ? "scope=mine&status=open" : tab === "given" ? "scope=given&status=open" : "scope=all&status=open";
  const { data, error, loading, reload, setData } = useApi(`/console/commitments?${query}`);
  const eventList = useMemo(() => (events || []).filter((e) => e?._id && e?.name), [events]);
  const blank = () => ({ title: "", ownerId: data?.me || "", dueDate: "", about: "", area: "other", eventKey: eventKeyOf(chosenEvent), notes: "" });
  const [form, setForm] = useState(null);
  const [more, setMore] = useState(false);
  const [adding, setAdding] = useState(false);
  const [modal, setModal] = useState(null); // { kind: flag | resolve | edit, item? }
  const f = form || blank();

  const items = useMemo(() => {
    const list = data?.items || [];
    return tab === "flags" ? list.filter((i) => i.flag?.open) : list;
  }, [data, tab]);
  const upsert = (item) => { setModal(null); reload(); return item; };

  const add = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) { toast.error("Type what needs doing first."); return; }
    setAdding(true);
    try {
      const out = await api.post("/console/commitments", { ...f, ownerId: f.ownerId || data.me });
      toast.success(out.item.ownerId === data.me ? "Added to your list." : `Added. ${out.item.ownerName} has been emailed.`);
      setForm(null); setMore(false); reload();
    } catch (err) { toast.error(err); } finally { setAdding(false); }
  };
  const markDone = async (item, done) => {
    setData((d) => (d ? { ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, status: done ? "done" : "open" } : i)) } : d));
    try { await api.post(`/console/commitments/${item.id}/done`, { done }); toast.success(done ? "Done. Nice work." : "Reopened."); reload(); }
    catch (err) { toast.error(err); reload(); }
  };

  const c = data?.counts || { mine: 0, overdue: 0, flags: 0 };
  return (
    <>
      <PageHeader
        title="My work"
        description="Your own list: what you've promised to do and when it's due. When someone agrees to do something, add it here so it isn't forgotten. Only you and the managers can see your list."
        actions={<Button icon={Flag} onClick={() => setModal({ kind: "flag" })}>Raise a flag</Button>}
      />

      {c.overdue > 0 && tab === "mine" && (
        <Banner tone="warn" className="mb-4" title={`${c.overdue} of your tasks ${c.overdue === 1 ? "is" : "are"} overdue`}>
          Finish them and tick them off, or change the date. If something is stopping you, raise a flag.
        </Banner>
      )}

      <Card as="form" onSubmit={add} className="mb-6">
        <h2 className="mb-3 text-base font-bold text-[#151035]">Add a task</h2>
        {!data ? <p className="text-sm text-[#6B6688]">Loading…</p> : more ? (
          <TaskFields form={f} setForm={(fn) => setForm((cur) => (typeof fn === "function" ? fn(cur || blank()) : fn))} data={data} events={eventList} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_200px_170px]">
            <Field label="What needs doing?" required>
              {(id) => <Input id={id} value={f.title} onChange={(e) => setForm({ ...f, title: e.target.value })} maxLength={200} placeholder="e.g. Send the signed MOU to Northline Robotics" />}
            </Field>
            <Field label="Who will do it?">
              {(id) => (
                <Select id={id} value={f.ownerId || data.me} onChange={(e) => setForm({ ...f, ownerId: e.target.value })}>
                  {data.people.map((p) => <option key={p.id} value={p.id}>{p.id === data.me ? "Me" : p.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="By when?">
              {(id) => <Input id={id} type="date" value={f.dueDate} onChange={(e) => setForm({ ...f, dueDate: e.target.value })} />}
            </Field>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary" type="submit" icon={Plus} loading={adding} disabled={!data}>Add task</Button>
          <button type="button" onClick={() => setMore((v) => !v)} className={`inline-flex items-center gap-1 text-[13px] font-semibold text-[#D6308C] hover:underline ${focusRing}`}>
            {more ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
            {more ? "Fewer details" : "More details (who it's about, notes)"}
          </button>
          <span className="text-[13px] text-[#6B6688]">The person doing it gets a reminder a week before, the day before and on the day.</span>
        </div>
      </Card>

      <Tabs label="Which tasks" value={tab} onChange={setTab} tabs={[
        { key: "mine", label: `Mine${c.mine ? ` (${c.mine})` : ""}` },
        data?.canSeeAll ? { key: "all", label: "Everyone's" } : { key: "given", label: "Given to others" },
        { key: "flags", label: `Flags${c.flags ? ` (${c.flags})` : ""}` },
        { key: "done", label: "Done" },
      ]} />

      {loading && !data ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !items.length ? (
        <EmptyState
          title={tab === "mine" ? "Nothing on your list" : tab === "flags" ? "No flags raised" : tab === "done" ? "Nothing finished yet" : "No tasks yet"}
          body={tab === "mine" ? "Add your first task above: what needs doing, who will do it and by when." : tab === "flags" ? (data?.canSeeAll ? "When someone needs help, their flag shows here until it's resolved." : "Flags you raise show here until a manager resolves them.") : tab === "given" ? "Tasks you give to someone else show here, so you can see when they're done." : "Tasks show here as the team adds them."}
        />
      ) : (
        <div className="space-y-5">
          {GROUPS.map(([key, title, hint]) => {
            const list = items.filter((i) => i.state === key);
            if (!list.length) return null;
            return (
              <Card key={key}>
                <div className="mb-1 flex flex-wrap items-baseline gap-2.5">
                  <h2 className="text-base font-bold text-[#151035]">{title}</h2>
                  <Badge tone={key === "flagged" || key === "overdue" ? "bad" : key === "done" ? "good" : "neutral"}>{list.length}</Badge>
                  {hint && <span className="text-xs text-[#6B6688]">{hint}</span>}
                </div>
                <ul>
                  {list.map((i) => (
                    <Row key={i.id} item={i} me={data.me} onDone={markDone}
                      onFlag={(item) => setModal({ kind: "flag", item })} onResolve={(item) => setModal({ kind: "resolve", item })} onEdit={(item) => setModal({ kind: "edit", item })} />
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {modal?.kind === "flag" && <FlagModal item={modal.item} data={data} eventKey={eventKeyOf(chosenEvent)} onClose={() => setModal(null)} onSaved={(i) => { upsert(i); if (!modal.item) setTab("flags"); }} />}
      {modal?.kind === "resolve" && <ResolveModal item={modal.item} onClose={() => setModal(null)} onSaved={upsert} />}
      {modal?.kind === "edit" && <EditModal item={modal.item} data={data} events={eventList} onClose={() => setModal(null)} onSaved={upsert} onDeleted={() => { setModal(null); reload(); }} />}
    </>
  );
}
