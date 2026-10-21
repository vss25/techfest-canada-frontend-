import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarClock, History, Info, Lock, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, ErrorState, Field, IconButton, Input, LoadingState, PageHeader, SectionTitle, Switch, TableWrap } from "../ui";
import { when } from "../format";
import { isoFromTorontoInput, torontoInputValue } from "../../jury/juryLib";
import { EYEBROW, JURY, plural } from "./juryShared";

/* =========================================================
   Admin › Catalyst Awards › Scoring rubric (Oct 2026)
   "The jury shouldn't be spending more than 5 minutes per person
   to rate. So, the metrics should be easy to follow."
     - The criteria jurors score 1–5: name, what it measures, the
       one-line meaning of 1, 3 and 5, the weight (equal by
       default). Rename, reword, reweight, reorder, add (up to 6),
       remove, or go back to the built-in five.
     - Every save that changes something is a new version; scores
       already given keep the version and criteria they were given
       on, so nothing is rewritten.
     - The deadline (Toronto time): after it, assessments lock.
   Management changes; staff can look.
   Backend: /console/jury/rubric, /console/jury/settings.
========================================================= */

const clone = (x) => JSON.parse(JSON.stringify(x));
const blank = () => ({ key: "", label: "", help: "", weight: 1, anchors: { 1: "", 3: "", 5: "" } });

function DeadlineCard({ settings, canEdit, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(() => torontoInputValue(settings.deadline));
  const [none, setNone] = useState(!settings.deadline);
  const [busy, setBusy] = useState(false);
  const iso = none ? null : isoFromTorontoInput(value);
  const dirty = none ? !!settings.deadline : iso && iso !== settings.deadline;
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`${JURY}/settings`, { deadline: none ? null : iso });
      toast.success(none ? "Deadline removed" : "Deadline saved");
      onSaved();
    } catch (e) { toast.error(e); } finally { setBusy(false); }
  };
  return (
    <Card className="mb-6">
      <SectionTitle hint="Toronto time. After it, jurors can read their assessments but can't change, submit or reopen them. Move it to reopen.">Deadline</SectionTitle>
      {settings.locked && <Banner tone="warn" icon={Lock} className="mb-4" title={`Judging closed on ${settings.deadlineText}`}>Every assessment is locked now.</Banner>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Field label="Submissions close at (ET)" className="sm:w-72">
          {(id) => <Input id={id} type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} disabled={!canEdit || none} />}
        </Field>
        <div className="pb-1"><Switch checked={none} onChange={setNone} disabled={!canEdit} label="No deadline" /></div>
        {canEdit && <Button variant="primary" icon={Save} loading={busy} disabled={!dirty} onClick={save} className="sm:mb-0.5">Save deadline</Button>}
      </div>
      <p className="mt-3 text-xs text-ttfc-dim">Now: {settings.deadline ? settings.deadlineText : "no deadline"}{settings.updatedBy ? ` · last changed by ${settings.updatedBy}` : ""}. Awards night is the evening of October 26.</p>
    </Card>
  );
}

function CriterionEditor({ c, i, count, share, onChange, onMove, onRemove, disabled, limits }) {
  const set = (k, v) => onChange({ ...c, [k]: v });
  const setAnchor = (p, v) => onChange({ ...c, anchors: { ...c.anchors, [p]: v } });
  return (
    <div className="rounded-2xl border border-ttfc-line bg-ttfc-panel2 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ttfc-purple/20 text-sm font-bold text-violet-100">{i + 1}</span>
          {c.key ? <span className="font-mono text-[11px] text-ttfc-dim" title="Its scores are stored under this key, so renaming keeps them">{c.key}</span> : <Badge tone="pink">New</Badge>}
        </div>
        {!disabled && (
          <div className="flex">
            <IconButton icon={ArrowUp} label="Move up" disabled={i === 0} onClick={() => onMove(-1)} />
            <IconButton icon={ArrowDown} label="Move down" disabled={i === count - 1} onClick={() => onMove(1)} />
            <IconButton icon={Trash2} label="Remove this criterion" disabled={count <= limits.minCriteria} onClick={onRemove} />
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
        <Field label="Name">{(id) => <Input id={id} value={c.label} maxLength={limits.labelMax} onChange={(e) => set("label", e.target.value)} disabled={disabled} />}</Field>
        <Field label="Weight" hint={`${share}% of the total`}>
          {(id) => <Input id={id} type="number" min={limits.weightMin} max={limits.weightMax} step={0.5} value={c.weight} onChange={(e) => set("weight", e.target.value)} disabled={disabled} />}
        </Field>
      </div>
      <Field label="What it measures" className="mt-3">{(id) => <Input id={id} value={c.help} maxLength={limits.helpMax} onChange={(e) => set("help", e.target.value)} disabled={disabled} />}</Field>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {["1", "3", "5"].map((p) => (
          <Field key={p} label={`A ${p} means`}>
            {(id) => <Input id={id} value={c.anchors?.[p] || ""} maxLength={limits.anchorMax} onChange={(e) => setAnchor(p, e.target.value)} disabled={disabled} placeholder={p === "1" ? "Low" : p === "5" ? "High" : "Middle"} />}
          </Field>
        ))}
      </div>
    </div>
  );
}

export default function JuryRubric() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi(`${JURY}/rubric`);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  const saved = useMemo(() => data?.rubric?.criteria || [], [data]);
  const list = draft ?? saved;
  const limits = data?.limits || { minCriteria: 1, maxCriteria: 6, labelMax: 60, helpMax: 160, anchorMax: 160, weightMin: 0.1, weightMax: 10 };
  const sum = list.reduce((s, c) => s + (Number(c.weight) || 0), 0) || 1;
  const share = (c) => Math.round(((Number(c.weight) || 0) / sum) * 1000) / 10;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);
  const submittedSoFar = Object.values(data?.usage || {}).reduce((s, n) => s + n, 0);
  const edit = (fn) => setDraft((d) => { const next = clone(d ?? saved); fn(next); return next; });

  if (loading) return <LoadingState label="Loading the rubric…" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.put(`${JURY}/rubric`, { criteria: list.map((c) => ({ ...c, weight: Number(c.weight) })) });
      setData((d) => ({ ...d, ...r }));
      setDraft(null);
      toast.success(r.created ? `Saved as version ${r.rubric.version}` : "Nothing changed");
    } catch (e) { toast.error(e); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader eyebrow={EYEBROW} title="Scoring rubric"
        description="What jurors score each nomination on: up to six criteria, each from 1 to 5 with a one-line meaning for 1, 3 and 5, plus an optional overall recommendation (Strong yes, Yes, Maybe, No) and a short comment. Keep it quick: about 5 minutes a nominee." />

      <DeadlineCard key={data.settings.deadline || "none"} settings={data.settings} canEdit={isManagement} onSaved={reload} />

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <SectionTitle className="mb-0" hint={`Version ${data.rubric.version}${data.rubric.builtIn ? " (the built-in rubric)" : data.rubric.createdBy ? `, saved by ${data.rubric.createdBy} ${when(data.rubric.createdAt)}` : ""}. The total is out of 100: a 1 counts 0, a 3 counts 50, a 5 counts 100, weighted.`}>
            Criteria
          </SectionTitle>
          {isManagement && (
            <div className="flex flex-wrap gap-2">
              <Button icon={RotateCcw} onClick={() => setDraft(clone(data.defaults))}>Use the built-in five</Button>
              <Button icon={Plus} disabled={list.length >= limits.maxCriteria} onClick={() => edit((d) => d.push(blank()))}>Add a criterion</Button>
            </div>
          )}
        </div>
        {submittedSoFar > 0 && (
          <Banner tone="info" icon={Info} className="mb-4" title={`${plural(submittedSoFar, "assessment")} already submitted`}>
            Changing the rubric never rewrites them. A renamed criterion keeps its scores. A removed one stops counting in the totals. A new one has no score from assessments already submitted (jurors can reopen them and add it before the deadline).
          </Banner>
        )}
        {!isManagement && <Banner tone="info" className="mb-4" title="Only management can change the rubric" />}
        <div className="flex flex-col gap-4">
          {list.map((c, i) => (
            <CriterionEditor key={`${c.key || "new"}-${i}`} c={c} i={i} count={list.length} share={share(c)} limits={limits} disabled={!isManagement}
              onChange={(next) => edit((d) => { d[i] = next; })}
              onMove={(dir) => edit((d) => { const [x] = d.splice(i, 1); d.splice(i + dir, 0, x); })}
              onRemove={() => edit((d) => { d.splice(i, 1); })} />
          ))}
        </div>
        {isManagement && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button variant="primary" icon={Save} loading={busy} disabled={!dirty} onClick={save}>Save rubric</Button>
            {dirty && <Button variant="ghost" onClick={() => setDraft(null)}>Discard changes</Button>}
            <span className="text-xs text-ttfc-dim">{dirty ? "Saving makes a new version. Jurors see it straight away." : "No unsaved changes."}</span>
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <SectionTitle hint="Fixed for every nominee.">Also on every assessment</SectionTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ttfc-muted">
          <li>Overall recommendation (optional): {(data.recommendations || []).map((r) => r.label).join(", ")}.</li>
          <li>Comment (optional): up to {limits.commentMax} characters. Shown with the juror's name on the results page (management only).</li>
          <li>Submitting needs every criterion scored. Drafts save as they go and never count.</li>
        </ul>
      </Card>

      <Card>
        <SectionTitle hint="Each save that changes something. Submitted assessments keep the version they were given on.">
          <span className="inline-flex items-center gap-2"><History className="h-4 w-4" aria-hidden="true" /> Versions</span>
        </SectionTitle>
        <TableWrap>
          <thead><tr><th>Version</th><th>Criteria</th><th>Saved</th><th>Submitted on it</th></tr></thead>
          <tbody>
            {[...data.versions, ...(data.versions.some((v) => v.version === 1) ? [] : [{ version: 1, labels: data.defaults.map((c) => c.label), createdBy: "", createdAt: null, builtIn: true }])].map((v) => (
              <tr key={v.version}>
                <td className="font-semibold">v{v.version}{v.version === data.rubric.version && <Badge tone="good" className="ml-2">Current</Badge>}</td>
                <td className="text-xs text-ttfc-muted">{v.labels.join(" · ")}</td>
                <td className="whitespace-nowrap text-xs text-ttfc-muted">{v.builtIn ? "Built in" : `${v.createdBy || "—"} · ${when(v.createdAt)}`}</td>
                <td className="tabular-nums">{data.usage?.[String(v.version)] || 0}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ttfc-dim"><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> The deadline and what can be allocated aren't versioned: they apply as soon as they're saved.</p>
      </Card>
    </>
  );
}
