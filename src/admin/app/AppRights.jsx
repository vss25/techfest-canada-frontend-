import { useState } from "react";
import { Info, Lock, RotateCcw, Save } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Button, ConfirmDialog, ErrorState, LoadingState, PageHeader, Switch, TableWrap } from "../ui";
import { when } from "../format";
import { ADMIN_POWERS, PERSON_TYPES, RIGHTS, RIGHT_LABELS, TYPE_LABELS } from "./personTypes";

/* App → App rights: what each person type may do in the app
   (GET/PUT /api/console/app-rights). Everyone on the panel can look;
   only management can change it. */

const GROUPS = [
  { title: "Messages and connections", rights: ["sendMessages", "receiveMessages", "sendRequests", "receiveRequests", "shareContact"] },
  { title: "Community", rights: ["post", "comment", "startDiscussions", "createGroups"] },
  { title: "Staff powers", rights: ["deleteAnyPost", "moderate", "checkIn"] },
];

const copy = (m) => JSON.parse(JSON.stringify(m || {}));
const countDiff = (a, b) => PERSON_TYPES.reduce((n, t) => n + RIGHTS.filter((r) => !!a?.[t]?.[r] !== !!b?.[t]?.[r]).length, 0);

export default function AppRights() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi("/console/app-rights");
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (loading) return <LoadingState label="Loading app rights…" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const saved = data.matrix;
  const matrix = draft || saved;
  const canEdit = !!data.canEdit;
  const labels = { ...RIGHT_LABELS, ...(data.labels || {}) };
  const unsaved = draft ? countDiff(draft, saved) : 0;
  const custom = countDiff(saved, data.defaults);

  const set = (t, r, v) => setDraft((d) => {
    const next = copy(d || saved);
    next[t] = { ...next[t], [r]: v };
    return next;
  });

  const put = async (body, message) => {
    setSaving(true);
    try {
      const r = await api.put("/console/app-rights", body);
      setData(r);
      setDraft(null);
      toast.success(r.changed?.length ? message : "Nothing changed");
      return true;
    } catch (e) { toast.error(e); return false; } finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader
        eyebrow="App"
        title="App rights"
        description="Choose what each type of person can do in the TTFC app. Set someone's type on their profile under People."
      />
      <Banner tone="info" icon={Info} className="mb-4">
        Someone with several types gets any ability one of them allows. For being contacted, the most protective type wins. Per-person switches on their profile still apply.
      </Banner>
      <ul className="mb-6 space-y-1 text-xs leading-relaxed text-ttfc-muted">
        <li>Delegate covers pass holders with no other type, and anyone with no type at all.</li>
        <li>VIP is a yes / no switch on the person, not a column: a VIP gets the rights of their other types. To stop people contacting a VIP, switch off messages or connection requests on their profile.</li>
        <li>Staff accounts with admin panel access always keep {ADMIN_POWERS.map((r) => labels[r].toLowerCase()).join(", ").replace(/, ([^,]*)$/, " and $1")}.</li>
        <li>Posting in the feed and creating groups also follow the switches on App text &amp; switches{data.flags?.allowPosts === false || data.flags?.allowGroups === false ? " (one of them is off right now)" : ""}.</li>
        <li>Phones pick up changes within about a minute.</li>
      </ul>
      {!canEdit && (
        <Banner tone="warn" icon={Lock} className="mb-4">Only management can change app rights.</Banner>
      )}

      <p className="mb-2 text-xs text-ttfc-dim sm:hidden">Scroll sideways to see every type.</p>
      <TableWrap>
        <thead>
          <tr>
            <th scope="col" className="!left-0 !z-[2] min-w-[150px] sm:min-w-[220px]">Can they…</th>
            {PERSON_TYPES.map((t) => <th key={t} scope="col" className="text-center">{TYPE_LABELS[t]}</th>)}
          </tr>
        </thead>
        {GROUPS.map((g) => (
          <tbody key={g.title}>
            <tr>
              <th scope="colgroup" colSpan={PERSON_TYPES.length + 1} className="!static !bg-white/[0.03] !pt-4 !text-ttfc-dim"><span className="sticky left-4">{g.title}</span></th>
            </tr>
            {g.rights.map((r) => (
              <tr key={r}>
                <th scope="row" className="!left-0 !z-[1] min-w-[150px] !whitespace-normal !bg-ttfc-panel !text-sm !font-semibold !normal-case !tracking-normal !text-ttfc-text">{labels[r]}</th>
                {PERSON_TYPES.map((t) => {
                  const v = !!matrix?.[t]?.[r];
                  const changed = draft && v !== !!saved?.[t]?.[r];
                  const notDefault = v !== !!data.defaults?.[t]?.[r];
                  return (
                    <td key={t} className="text-center">
                      <span className={`inline-flex rounded-full p-0.5 ${changed ? "ring-2 ring-ttfc-orange/70" : ""}`}
                        title={notDefault ? `Changed from the default (${data.defaults?.[t]?.[r] ? "on" : "off"})` : undefined}>
                        <Switch
                          checked={v}
                          disabled={!canEdit || saving}
                          onChange={(next) => set(t, r, next)}
                          ariaLabel={`${TYPE_LABELS[t]}: ${labels[r]}`}
                        />
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        ))}
      </TableWrap>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-xs text-ttfc-muted">
          {custom ? `${custom} setting${custom === 1 ? "" : "s"} changed from the defaults.` : "Using the defaults."}
          {data.updatedBy && ` Last saved by ${data.updatedBy}${data.updatedAt ? `, ${when(data.updatedAt)}` : ""}.`}
        </p>
        {canEdit && (
          <Button variant="dangerOutline" icon={RotateCcw} disabled={saving || (!custom && !unsaved)} onClick={() => setConfirmReset(true)}>
            Reset to defaults
          </Button>
        )}
      </div>

      {unsaved > 0 && (
        <div className="sticky bottom-4 z-20 mt-4 flex flex-col gap-3 rounded-2xl border border-ttfc-pink/40 bg-ttfc-panel2/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur sm:flex-row sm:items-center" role="region" aria-label="Unsaved changes">
          <p className="flex-1 text-sm">
            <b>{unsaved} unsaved change{unsaved === 1 ? "" : "s"}.</b>{" "}
            <span className="text-ttfc-muted">Changed switches have an orange ring.</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>Discard</Button>
            <Button variant="primary" icon={Save} loading={saving} onClick={() => put({ matrix: draft }, "App rights saved. Phones pick them up within about a minute.")}>Save</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset app rights to the defaults?"
        body="Every type goes back to the built-in settings. Per-person switches and types on profiles stay as they are."
        confirmLabel="Reset to defaults"
        onConfirm={() => put({ reset: true }, "App rights are back to the defaults.")}
      />
    </>
  );
}
