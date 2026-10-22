import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, Gavel, Scale, Search, Settings2, ShieldAlert, UserMinus, UserPlus, Users, X } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Drawer, EmptyState, ErrorState, Field, Input, LoadingState, Modal, PageHeader, Select, Switch, TableWrap, Tabs,
} from "../ui";
import { num } from "../format";
import { EYEBROW, JURY, NOMINATION_STATUS, plural } from "./juryShared";
import { StateBadge, StatusBadge } from "./juryBadges";

/* =========================================================
   Admin › Catalyst Awards › Allocation (Oct 2026)
   Which jurors review which nominations ("The jury will be
   allocated startups to evaluate by the admin itself").
     - The list of nominations that can be allocated (shortlisted
       by default, pending while nothing is shortlisted, staff can
       widen it; never "Not progressing"), filtered by category,
       pillar, sector, special award, status, coverage, search.
     - Who's on each one and where they are; conflicts declared.
     - Tick nominations, then: Assign to jurors (each picked juror
       gets each picked nomination), Balance (each nomination gets
       N jurors, least-loaded first, previewed before anything is
       saved) or Unassign (scores kept, no longer counted).
     - A nomination's drawer: add or remove jurors, clear a conflict.
     - Each juror's load.
   Changes are management only; staff can look.
   Backend: /console/jury/nominations, /assign, /assign-balanced,
   /unassign, /conflicts/clear, /settings (routes/juryAdmin.js).
========================================================= */

const COVERAGE = [
  { key: "", label: "All" },
  { key: "none", label: "No jurors" },
  { key: "conflict", label: "Conflicts" },
  { key: "open", label: "Not all submitted" },
  { key: "done", label: "All submitted" },
];
const POOL = ["pending", "shortlisted", "winner"];

const skippedText = (skipped = []) => {
  const by = {};
  for (const s of skipped) by[s.label] = (by[s.label] || 0) + 1;
  return Object.entries(by).map(([label, n]) => `${n} ${label.toLowerCase()}`).join(", ");
};

function JurorPicker({ jurors, picked, setPicked, note }) {
  const all = jurors.filter((j) => j.active);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-ttfc-muted">
        <span>{note || `${picked.size} picked`}</span>
        <span className="flex gap-3">
          <button type="button" className="font-semibold text-ttfc-pink hover:text-ttfc-contrast" onClick={() => setPicked(new Set(all.map((j) => j.id)))}>All</button>
          <button type="button" className="font-semibold text-ttfc-muted hover:text-ttfc-contrast" onClick={() => setPicked(new Set())}>None</button>
        </span>
      </div>
      <ul className="max-h-72 divide-y divide-ttfc-line/70 overflow-y-auto rounded-xl border border-ttfc-line">
        {jurors.map((j) => (
          <li key={j.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-ttfc-contrast/[0.03]">
              <input type="checkbox" className="h-4 w-4 accent-ttfc-purple" checked={picked.has(j.id)} disabled={!j.active}
                onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(j.id); else n.delete(j.id); setPicked(n); }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{j.name}{!j.active && <span className="ml-2 text-xs font-normal text-ttfc-dim">switched off</span>}</span>
                {j.organisation && <span className="block truncate text-xs text-ttfc-dim">{j.organisation}</span>}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-ttfc-muted">{plural(j.load, "nomination")}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssignModal({ rows, jurors, onClose, onDone }) {
  const toast = useToast();
  const [picked, setPicked] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setBusy(true); setErr("");
    try {
      const r = await api.post(`${JURY}/assign`, { jurorIds: [...picked], nominationIds: rows.map((x) => x.id) });
      toast.success(`${plural(r.added + r.reactivated, "allocation")} made${r.reactivated ? ` (${r.reactivated} given back, with their scores)` : ""}`);
      if (r.skipped?.length) toast.info(`Skipped: ${skippedText(r.skipped)}.`, { duration: 9000 });
      onDone(); onClose();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} size="lg" title={`Assign ${plural(rows.length, "nomination")} to jurors`}
      description="Every juror you pick gets every nomination you ticked. Anyone already on one, or who declared a conflict on it, is skipped."
      footer={<>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" icon={UserPlus} loading={busy} disabled={!picked.size} onClick={go}>Assign {picked.size ? `to ${plural(picked.size, "juror")}` : ""}</Button>
      </>}>
      <JurorPicker jurors={jurors} picked={picked} setPicked={setPicked} />
      {err && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p>}
    </Modal>
  );
}

function BalanceModal({ rows, jurors, onClose, onDone }) {
  const toast = useToast();
  const [picked, setPicked] = useState(() => new Set(jurors.filter((j) => j.active).map((j) => j.id)));
  const [per, setPer] = useState(() => Math.min(3, Math.max(1, jurors.filter((j) => j.active).length)));
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const body = { jurorIds: [...picked], nominationIds: rows.map((x) => x.id), perNomination: Number(per) };
  const preview = async () => {
    setBusy("preview"); setErr("");
    try { setPlan(await api.post(`${JURY}/assign-balanced`, { ...body, dryRun: true })); } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const apply = async () => {
    setBusy("apply"); setErr("");
    try {
      const r = await api.post(`${JURY}/assign-balanced`, body);
      toast.success(`${plural(r.added + r.reactivated, "allocation")} made`);
      if (r.short?.length) toast.info(`${plural(r.short.length, "nomination")} couldn't get ${per} jurors (not enough jurors without a conflict).`, { duration: 9000 });
      onDone(); onClose();
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const perJuror = useMemo(() => {
    if (!plan) return [];
    const add = {};
    for (const p of plan.add) add[p.jurorId] = (add[p.jurorId] || 0) + 1;
    return jurors.filter((j) => picked.has(j.id)).map((j) => ({ ...j, add: add[j.id] || 0, after: plan.loadAfter?.[j.id] ?? j.load }));
  }, [plan, jurors, picked]);
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} size="lg" title={`Share ${plural(rows.length, "nomination")} between jurors`}
      description="Each nomination gets this many jurors in all (the ones already on it count). The least-loaded jurors are picked first, never someone who declared a conflict. Preview first: nothing is saved until you click Allocate."
      footer={<>
        <Button onClick={onClose} disabled={!!busy}>Cancel</Button>
        {!plan ? <Button variant="primary" icon={Scale} loading={busy === "preview"} disabled={!picked.size || per < 1} onClick={preview}>Preview</Button>
          : <Button variant="primary" icon={UserPlus} loading={busy === "apply"} disabled={!plan.add.length} onClick={apply}>Allocate {plural(plan.add.length, "assessment")}</Button>}
      </>}>
      <div className="flex flex-col gap-4">
        <Field label="Jurors per nomination" hint="Three is usual. More jurors means a fairer average and more work each.">
          {(id) => <Input id={id} type="number" min={1} max={20} value={per} onChange={(e) => { setPer(e.target.value); setPlan(null); }} className="max-w-[120px]" />}
        </Field>
        {!plan ? <JurorPicker jurors={jurors} picked={picked} setPicked={(s) => { setPicked(s); setPlan(null); }} note={`Share between ${plural(picked.size, "juror")}`} /> : (
          <div className="flex flex-col gap-3">
            <p className="text-sm">{plural(plan.add.length, "new allocation")} over {plural(rows.length, "nomination")}.</p>
            <ul className="divide-y divide-ttfc-line/70 rounded-xl border border-ttfc-line">
              {perJuror.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="truncate">{j.name}</span>
                  <span className="tabular-nums text-ttfc-muted">+{j.add} → {plural(j.after, "nomination")}</span>
                </li>
              ))}
            </ul>
            {plan.short?.length > 0 && (
              <Banner tone="warn" title={`${plural(plan.short.length, "nomination")} would get fewer than ${per}`}>
                {plan.short.slice(0, 8).map((s) => `${s.nomineeName} (${s.have})`).join(", ")}{plan.short.length > 8 ? "…" : ""}. Add jurors or pick fewer per nomination.
              </Banner>
            )}
            {plan.skipped?.length > 0 && <p className="text-xs text-ttfc-dim">Skipped: {skippedText(plan.skipped)}.</p>}
            <button type="button" className="self-start text-xs font-semibold text-ttfc-pink hover:text-ttfc-contrast" onClick={() => setPlan(null)}>Change the jurors or the number</button>
          </div>
        )}
        {err && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p>}
      </div>
    </Modal>
  );
}

function UnassignModal({ rows, onClose, onDone }) {
  const toast = useToast();
  const on = useMemo(() => {
    const m = new Map();
    for (const r of rows) for (const j of r.jurors) {
      const x = m.get(j.id) || { id: j.id, name: j.name, n: 0, submitted: 0 };
      x.n++;
      if (j.state === "submitted" || j.state === "editing") x.submitted++;
      m.set(j.id, x);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);
  const [picked, setPicked] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pairs = rows.flatMap((r) => r.jurors.filter((j) => picked.has(j.id)).map((j) => ({ jurorId: j.id, nominationId: r.id })));
  const losing = on.filter((j) => picked.has(j.id)).reduce((s, j) => s + j.submitted, 0);
  const go = async () => {
    setBusy(true); setErr("");
    try {
      const r = await api.post(`${JURY}/unassign`, { pairs });
      toast.success(`${plural(r.removed, "allocation")} taken off`);
      onDone(); onClose();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} size="lg" tone="danger" title={`Take jurors off ${plural(rows.length, "nomination")}`}
      description="They stop seeing these nominations. Anything they scored is kept but no longer counts; assign them again to bring it back."
      footer={<>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="danger" icon={UserMinus} loading={busy} disabled={!pairs.length} onClick={go}>Unassign {pairs.length ? plural(pairs.length, "allocation") : ""}</Button>
      </>}>
      {!on.length ? <p className="text-sm text-ttfc-muted">No jurors are on these nominations.</p> : (
        <ul className="divide-y divide-ttfc-line/70 rounded-xl border border-ttfc-line">
          {on.map((j) => (
            <li key={j.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                <input type="checkbox" className="h-4 w-4 accent-ttfc-pink" checked={picked.has(j.id)}
                  onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(j.id); else n.delete(j.id); setPicked(n); }} />
                <span className="flex-1 text-sm font-semibold">{j.name}</span>
                <span className="text-xs text-ttfc-muted">{plural(j.n, "of these", "of these")}{j.submitted ? ` · ${j.submitted} submitted` : ""}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {losing > 0 && <Banner tone="warn" className="mt-3" title={`${plural(losing, "submitted assessment")} will stop counting`}>They're kept, and come back if you assign the same juror again.</Banner>}
      {err && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p>}
    </Modal>
  );
}

function PoolModal({ pool, onClose, onDone }) {
  const toast = useToast();
  const [auto, setAuto] = useState(pool.automatic);
  const [picked, setPicked] = useState(new Set(pool.statuses));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`${JURY}/settings`, { poolStatuses: auto ? [] : [...picked] });
      toast.success("Saved");
      onDone(); onClose();
    } catch (e) { toast.error(e); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Which nominations can go to the jury" description="Nominations marked Not progressing never go to the jury."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!auto && !picked.size} onClick={save}>Save</Button></>}>
      <div className="flex flex-col gap-4">
        <Switch checked={auto} onChange={setAuto} label="Automatic" description="Shortlisted nominations; pending ones while nothing is shortlisted." />
        {!auto && POOL.map((s) => (
          <label key={s} className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-ttfc-purple" checked={picked.has(s)}
              onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(s); else n.delete(s); setPicked(n); }} />
            {NOMINATION_STATUS[s].label}
          </label>
        ))}
        <p className="text-xs text-ttfc-dim">Nominations already allocated stay on the jurors' lists whatever you pick here (unless they're marked Not progressing).</p>
      </div>
    </Modal>
  );
}

function NominationDrawer({ row, jurors, canManage, onClose, onChanged }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState("");
  if (!row) return null;
  const act = async (key, fn, ok) => {
    setBusy(key);
    try { await fn(); toast.success(ok); onChanged(); } catch (e) { toast.error(e); } finally { setBusy(""); }
  };
  return (
    <Drawer open onClose={onClose} width="max-w-xl" title={row.nomineeName} description={row.categoryLabel}
      footer={canManage && <Button icon={UserPlus} onClick={() => setAdding(true)}>Add jurors</Button>}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={row.status} />
        {!row.inPool && !row.hidden && <Badge tone="warn">Outside what's being allocated</Badge>}
        {row.hidden && <Badge tone="bad">Not progressing: hidden from the jury</Badge>}
        <span className="text-xs text-ttfc-muted">{[row.nomineeType, row.nomineeOrganisation].filter(Boolean).join(" · ")}</span>
      </div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ttfc-dim">Jurors ({row.jurors.length})</h3>
      {!row.jurors.length ? <p className="text-sm text-ttfc-muted">Nobody yet.</p> : (
        <ul className="divide-y divide-ttfc-line rounded-2xl border border-ttfc-line">
          {row.jurors.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{j.name}{!j.active && <span className="ml-2 text-xs font-normal text-ttfc-dim">switched off</span>}</span>
                {j.state === "conflict" && <span className="block text-xs text-red-200">Conflict declared{j.conflictReason ? `: ${j.conflictReason}` : ""}</span>}
              </span>
              <span className="flex items-center gap-2">
                <StateBadge state={j.state} />
                {canManage && j.state === "conflict" && (
                  <Button size="sm" loading={busy === `c${j.id}`} onClick={() => act(`c${j.id}`, () => api.post(`${JURY}/conflicts/clear`, { jurorId: j.id, nominationId: row.id }), `Conflict cleared: it's back on ${j.name}'s list`)}>Clear conflict</Button>
                )}
                {canManage && (
                  <Button size="sm" variant="ghost" icon={X} loading={busy === `u${j.id}`} onClick={() => act(`u${j.id}`, () => api.post(`${JURY}/unassign`, { pairs: [{ jurorId: j.id, nominationId: row.id }] }), `${j.name} taken off`)}>Unassign</Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {row.conflicts > 0 && <p className="mt-3 text-xs text-ttfc-muted">A juror who declared a conflict doesn't count. Add another juror to replace them.</p>}
      {adding && <AssignModal rows={[row]} jurors={jurors} onClose={() => setAdding(false)} onDone={onChanged} />}
    </Drawer>
  );
}

export default function JuryAllocation() {
  const { isManagement } = useAdmin();
  const { data, error, loading, reload } = useApi(`${JURY}/nominations`);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [pillar, setPillar] = useState("");
  const [sector, setSector] = useState("");
  const [special, setSpecial] = useState("");
  const [status, setStatus] = useState("");
  const [coverage, setCoverage] = useState("");
  const [picked, setPicked] = useState(new Set());
  const [modal, setModal] = useState(""); // assign | balance | unassign | pool
  const [openId, setOpenId] = useState("");

  const rows = useMemo(() => data?.rows || [], [data]);
  const jurors = useMemo(() => data?.jurors || [], [data]);
  const categories = useMemo(() => [...new Map(rows.map((r) => [r.categoryLabel, r.category])).entries()], [rows]);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!cat || r.categoryLabel === cat) && (!pillar || r.pillar === pillar) && (!sector || r.sector === sector)
    && (!special || r.specialAward === special) && (!status || r.status === status)
    && (!coverage || (coverage === "none" ? r.assigned === 0 : coverage === "conflict" ? r.conflicts > 0 : coverage === "done" ? r.assigned > 0 && r.submitted >= r.assigned : r.assigned > 0 && r.submitted < r.assigned))
    && (!needle || [r.nomineeName, r.nomineeOrganisation, r.category, ...r.jurors.map((j) => j.name)].some((v) => String(v || "").toLowerCase().includes(needle))));
  const pickedRows = rows.filter((r) => picked.has(r.id));
  const allShownPicked = shown.length > 0 && shown.every((r) => picked.has(r.id));
  const toggle = (id) => { const n = new Set(picked); if (n.has(id)) n.delete(id); else n.add(id); setPicked(n); };
  const counts = {
    "": rows.length, none: rows.filter((r) => r.assigned === 0).length, conflict: rows.filter((r) => r.conflicts > 0).length,
    open: rows.filter((r) => r.assigned > 0 && r.submitted < r.assigned).length, done: rows.filter((r) => r.assigned > 0 && r.submitted >= r.assigned).length,
  };
  const openRow = rows.find((r) => r.id === openId) || null;
  const pool = data?.pool;
  const poolText = pool ? pool.statuses.map((s) => NOMINATION_STATUS[s]?.label || s).join(" and ") : "";
  const done = () => { reload(); setPicked(new Set()); };

  return (
    <>
      <PageHeader eyebrow={EYEBROW} title="Allocation"
        description="Give each nomination to the jurors who'll score it. Tick nominations, then assign them to jurors or share them out evenly. Jurors see only what's allocated to them."
        actions={<Link to="/admin/awards/jury"><Button icon={Users}>Jurors</Button></Link>} />

      {pool && (
        <Banner tone="info" icon={Filter} className="mb-5" title={`Can be allocated: ${poolText}${pool.automatic ? " (automatic)" : ""}`}
          action={isManagement && <Button size="sm" icon={Settings2} onClick={() => setModal("pool")}>Change</Button>}>
          {pool.automatic ? "Shortlisted nominations, or pending ones while nothing is shortlisted. " : ""}Nominations marked Not progressing never go to the jury.
          {" "}{num(pool.counts?.shortlisted || 0)} shortlisted, {num(pool.counts?.pending || 0)} pending, {num(pool.counts?.winner || 0)} winners.
        </Banner>
      )}

      {jurors.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2" aria-label="Load per juror">
          {[...jurors].sort((a, b) => b.load - a.load).map((j) => (
            <span key={j.id} className={`inline-flex items-center gap-2 rounded-xl border border-ttfc-line bg-ttfc-panel px-3 py-1.5 text-xs ${j.active ? "" : "opacity-60"}`}>
              <span className="font-semibold text-ttfc-text">{j.name}</span>
              <span className="tabular-nums text-ttfc-muted">{j.load} · {j.submitted} done</span>
            </span>
          ))}
        </div>
      )}

      <Tabs tabs={COVERAGE.map((t) => ({ ...t, count: data ? counts[t.key] : undefined }))} value={coverage} onChange={setCoverage} label="Coverage" className="mb-3" />

      <div className="mb-3 grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-center">
        <div className="relative col-span-2 lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search nominee, organisation, juror" className="pl-9" aria-label="Search nominations" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className="col-span-2 lg:w-64">
          <option value="">All categories</option>
          {categories.map(([label, short]) => <option key={label} value={label}>{short}</option>)}
        </Select>
        <Select value={pillar} onChange={(e) => setPillar(e.target.value)} aria-label="Pillar" className="lg:w-48">
          <option value="">All pillars</option>
          {(data?.filters?.pillars || []).map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector" className="lg:w-48">
          <option value="">All sectors</option>
          {(data?.filters?.sectors || []).map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select value={special} onChange={(e) => setSpecial(e.target.value)} aria-label="Special award" className="lg:w-48">
          <option value="">Any special award</option>
          {(data?.filters?.specialAwards || []).map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="lg:w-40">
          <option value="">Any status</option>
          {Object.entries(NOMINATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      {isManagement && (
        <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-ttfc-line bg-ttfc-panel/95 px-3 py-2 backdrop-blur">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-ttfc-purple" checked={allShownPicked} disabled={!shown.length}
              onChange={(e) => { const n = new Set(picked); for (const r of shown) { if (e.target.checked) n.add(r.id); else n.delete(r.id); } setPicked(n); }} />
            Select all shown ({shown.length})
          </label>
          <span className="text-sm text-ttfc-muted">{picked.size ? `${plural(picked.size, "nomination")} ticked` : "Tick nominations to allocate them"}</span>
          <span className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" icon={UserPlus} disabled={!picked.size || !jurors.length} onClick={() => setModal("assign")}>Assign to jurors</Button>
            <Button size="sm" icon={Scale} disabled={!picked.size || !jurors.length} onClick={() => setModal("balance")}>Share out evenly</Button>
            <Button size="sm" icon={UserMinus} disabled={!pickedRows.some((r) => r.jurors.length)} onClick={() => setModal("unassign")}>Unassign</Button>
            {picked.size > 0 && <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>Clear</Button>}
          </span>
        </div>
      )}

      {!jurors.length && data && (
        <Banner tone="warn" className="mb-4" title="No jurors yet">Add jurors on the <Link className="underline" to="/admin/awards/jury">Jury</Link> page first.</Banner>
      )}

      {loading ? <LoadingState label="Loading nominations…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState icon={Gavel} title="Nothing to allocate yet" body={`No nominations are ${poolText.toLowerCase() || "ready"}. Shortlist nominations on the Nominations page, or change what can be allocated.`} />
      ) : !shown.length ? (
        <EmptyState icon={Search} title="Nothing matches" body="Try another filter." />
      ) : (
        <TableWrap>
          <thead><tr>{isManagement && <th className="w-10"><span className="sr-only">Pick</span></th>}<th>Nominee</th><th>Category</th><th>Status</th><th>Jurors</th><th>Coverage</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="is-clickable" onClick={() => setOpenId(r.id)}>
                {isManagement && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="h-4 w-4 accent-ttfc-purple" checked={picked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Pick ${r.nomineeName}`} />
                  </td>
                )}
                <td className="min-w-[200px] max-w-[260px]">
                  <button type="button" className="block max-w-full truncate text-left font-semibold hover:underline" onClick={(e) => { e.stopPropagation(); setOpenId(r.id); }}>{r.nomineeName}</button>
                  <span className="block truncate text-xs text-ttfc-muted">{[r.nomineeType, r.nomineeOrganisation].filter(Boolean).join(" · ")}</span>
                </td>
                <td className="max-w-[240px]"><span className="block truncate text-sm" title={r.categoryLabel}>{r.category}</span></td>
                <td>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={r.status} />
                    {r.hidden && <span className="text-[11px] text-red-200">Hidden from the jury</span>}
                    {!r.inPool && !r.hidden && <span className="text-[11px] text-ttfc-dim">Outside the pool</span>}
                  </div>
                </td>
                <td className="min-w-[200px]">
                  {r.jurors.length ? (
                    <div className="flex flex-wrap gap-1">
                      {r.jurors.map((j) => <StateBadge key={j.id} state={j.state} title={`${j.name}: ${j.stateLabel}${j.conflictReason ? ` (${j.conflictReason})` : ""}`}>{j.name}</StateBadge>)}
                    </div>
                  ) : <span className="text-xs text-ttfc-dim">Nobody yet</span>}
                </td>
                <td className="whitespace-nowrap text-xs">
                  <span className="block text-ttfc-text">{plural(r.assigned, "juror")}</span>
                  <span className="block text-ttfc-muted">{r.submitted} submitted{r.drafts ? ` · ${r.drafts} draft${r.drafts === 1 ? "" : "s"}` : ""}</span>
                  {r.conflicts > 0 && <span className="mt-0.5 flex items-center gap-1 text-red-200"><ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />{plural(r.conflicts, "conflict")}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {modal === "assign" && <AssignModal rows={pickedRows} jurors={jurors} onClose={() => setModal("")} onDone={done} />}
      {modal === "balance" && <BalanceModal rows={pickedRows} jurors={jurors} onClose={() => setModal("")} onDone={done} />}
      {modal === "unassign" && <UnassignModal rows={pickedRows} onClose={() => setModal("")} onDone={done} />}
      {modal === "pool" && pool && <PoolModal pool={pool} onClose={() => setModal("")} onDone={reload} />}
      {openRow && <NominationDrawer row={openRow} jurors={jurors} canManage={isManagement} onClose={() => setOpenId("")} onChanged={reload} />}
    </>
  );
}
