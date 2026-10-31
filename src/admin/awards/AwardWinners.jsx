import { useMemo, useState } from "react";
import { EyeOff, ExternalLink, Info, RotateCcw, Save, Trophy } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Switch, Textarea } from "../ui";
import { when } from "../format";
import { EYEBROW } from "./juryShared";

/* =========================================================
   Admin › Catalyst Awards › Winners (Oct 31 2026)
   What the website's /awards page ("Results are out"), each
   winner's page and certificate (/awards/winners/<id>) and the apps
   show for every nomination marked Winner in Nominations: the
   award's name, who it was presented to, the company, the date, a
   line about why, the order, or hide one. Empty = the default (in
   grey), worked out from the nomination. The switch shows or hides
   all of them. Management changes; staff can look.
   Backend: /api/console/nominations/winners, PATCH /:id/award;
   the switch is site.award_winners.
========================================================= */

const BASE = "/console/nominations";
const SWITCH = "site.award_winners";
const FIELDS = ["title", "presentedTo", "company", "presentedOn", "citation", "order", "hidden"];

const formOf = (row) => ({ ...row.set, order: String(row.set.order ?? 0), hidden: !!row.hidden });

function WinnerCard({ row, canEdit, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => formOf(row));
  const [busy, setBusy] = useState(false);
  const base = useMemo(() => formOf(row), [row]);
  const dirty = FIELDS.some((k) => String(form[k] ?? "") !== String(base[k] ?? ""));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const save = async () => {
    const body = {};
    for (const k of FIELDS) if (String(form[k] ?? "") !== String(base[k] ?? "")) body[k] = k === "order" ? Number(form.order || 0) : form[k];
    setBusy(true);
    try {
      const r = await api.patch(`${BASE}/${row.id}/award`, body);
      toast.success(`Saved: ${r.row.presentedTo}`);
      onSaved(r.row);
    } catch (e) { toast.error(e); } finally { setBusy(false); }
  };

  return (
    <Card className="mb-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ttfc-orange">{row.category}</p>
          <h2 className="mt-1 text-lg font-bold text-ttfc-text">{row.company}{row.showCompany ? ` · ${row.presentedTo}` : ""}</h2>
          <p className="mt-0.5 text-sm text-ttfc-muted">{row.award}</p>
          <p className="mt-1 text-xs text-ttfc-dim">Nomination: {row.nominee.name} ({row.nominee.type || "nominee"}{row.nominee.organisation && row.nominee.organisation !== row.nominee.name ? `, ${row.nominee.organisation}` : ""})</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {row.hidden && <Badge tone="warn" icon={EyeOff}>Hidden</Badge>}
          <a className="inline-flex items-center gap-1.5 text-sm font-semibold text-ttfc-purple hover:underline" href={`/awards/winners/${row.id}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} aria-hidden="true" /> Open the page
          </a>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Award name" hint={`Empty = ${row.defaults.title}`} className="sm:col-span-2">
          {(id) => <Input id={id} value={form.title} onChange={set("title")} placeholder={row.defaults.title} maxLength={200} disabled={!canEdit} />}
        </Field>
        <Field label="Presented to" hint={`A person, or the company. Empty = ${row.defaults.presentedTo}`}>
          {(id) => <Input id={id} value={form.presentedTo} onChange={set("presentedTo")} placeholder={row.defaults.presentedTo} maxLength={160} disabled={!canEdit} />}
        </Field>
        <Field label="Company" hint={`Shown on the card. Empty = ${row.defaults.company}`}>
          {(id) => <Input id={id} value={form.company} onChange={set("company")} placeholder={row.defaults.company} maxLength={160} disabled={!canEdit} />}
        </Field>
        <Field label="Presented on" hint="Empty = 26 October 2026 (Awards Night)">
          {(id) => <Input id={id} type="date" value={form.presentedOn} onChange={set("presentedOn")} disabled={!canEdit} />}
        </Field>
        <Field label="Order" hint="Lowest first; ties go by award name, special awards last">
          {(id) => <Input id={id} type="number" min={-999} max={999} step={1} value={form.order} onChange={set("order")} disabled={!canEdit} />}
        </Field>
        <Field label="A line about why (optional)" hint="Shown on the winner's page and the certificate, in quotes. 400 characters at most." className="sm:col-span-2">
          {(id) => <Textarea id={id} rows={2} value={form.citation} onChange={set("citation")} maxLength={400} disabled={!canEdit} />}
        </Field>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Switch checked={form.hidden} onChange={set("hidden")} disabled={!canEdit} label="Hide from the website and the apps" />
        {canEdit && (
          <div className="flex gap-2">
            {dirty && <Button variant="ghost" icon={RotateCcw} onClick={() => setForm(base)} disabled={busy}>Undo</Button>}
            <Button variant="primary" icon={Save} loading={busy} disabled={!dirty} onClick={save}>Save</Button>
          </div>
        )}
      </div>
      {row.updatedBy && <p className="mt-3 text-xs text-ttfc-dim">Last changed by {row.updatedBy}{row.updatedAt ? `, ${when(row.updatedAt)}` : ""}.</p>}
    </Card>
  );
}

export default function AwardWinners() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi(`${BASE}/winners`);
  const [switching, setSwitching] = useState(false);

  const toggle = async (on) => {
    setSwitching(true);
    try {
      await api.put(`/console/app-content/${encodeURIComponent(SWITCH)}`, { value: on });
      setData((d) => ({ ...d, live: on }));
      toast.success(on ? "The winners are on the website and in the apps" : "The winners are hidden everywhere");
    } catch (e) { toast.error(e); } finally { setSwitching(false); }
  };
  const replace = (row) => { setData((d) => ({ ...d, rows: d.rows.map((r) => (r.id === row.id ? row : r)) })); reload(); };

  return (
    <div>
      <PageHeader
        eyebrow={EYEBROW}
        title="Winners"
        description="What the Catalyst Awards page shows under “Results are out”, on each winner’s page and certificate (PDF / JPG, Share on LinkedIn), and in the apps. Winners are the nominations marked Winner in Nominations."
      />
      {error && !data ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <LoadingState /> : (
        <>
          <Card className="mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Switch checked={!!data.live} onChange={toggle} disabled={!isManagement || switching}
                label="Show the winners" description="On the website’s Catalyst Awards page, the winners’ pages and the apps. Off: nothing about winners shows anywhere." />
              <Badge tone={data.live ? "good" : "neutral"} icon={Trophy}>{data.rows.filter((r) => !r.hidden).length} shown</Badge>
            </div>
            {!isManagement && <p className="mt-3 text-xs text-ttfc-dim">Only management can change the winners.</p>}
          </Card>
          <Banner tone="info" icon={Info} className="mb-6" title="Empty fields use the default">
            The defaults come from the nomination: the award from its category, the company from the nominee’s organisation, and “presented to” from the nominee’s name. Change a field only where the default isn’t right.
          </Banner>
          {data.rows.length === 0
            ? <EmptyState icon={Trophy} title="No winners yet" body="Mark nominations as Winner in Catalyst Awards › Nominations, and they appear here." />
            : data.rows.map((row) => <WinnerCard key={`${row.id}:${row.updatedAt || ""}`} row={row} canEdit={isManagement} onSaved={replace} />)}
        </>
      )}
    </div>
  );
}
