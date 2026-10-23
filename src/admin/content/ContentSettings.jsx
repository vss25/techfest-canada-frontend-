import { useState } from "react";
import { Info, Lock, RotateCcw } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Button, Card, ErrorState, Input, LoadingState, Switch, Textarea, focusRing } from "../ui";
import { when } from "../format";
import { EMAIL_RE, HIDDEN_KEYS, REGISTRY, SCOPES, URL_RE, humanize, scopeOf } from "./registry";
import { useAdmin } from "../adminContext";

/* One consistent editor for the texts & switches in GET/PUT /api/console/app-content.
   Used by Website switches → Website options (scope "website"), App text & switches (scope "app") and
   2027 waitlist › Wording (scope "stay") and › 2027 journey (scope "journey": the heading and introduction).
   Settings only management may change (ticket sales, pass upgrades: REGISTRY `management`, or the
   server's `managementOnly`) show disabled with "Management only" for everyone else; the server
   refuses them too. The guest offer's settings (HIDDEN_KEYS) aren't shown at all. */
const REGISTRY_ORDER = new Map(Object.keys(REGISTRY).map((k, i) => [k, i]));
const byRegistryOrder = (a, b) => (REGISTRY_ORDER.get(a.key) ?? 1e6) - (REGISTRY_ORDER.get(b.key) ?? 1e6);

function ManagementTag() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-ttfc-line px-2 py-0.5 align-middle text-[11px] font-semibold text-ttfc-muted">
      <Lock className="h-3 w-3" aria-hidden="true" /> Management only
    </span>
  );
}

const SAVED = {
  website: "Saved — live on the website within about a minute",
  app: "Saved — phones pick it up within about a minute",
  stay: "Saved — live on the waitlist page and in the web app within about a minute",
  journey: "Saved — live on the waitlist page and in the web app within about a minute",
};
const clip = (s, n = 140) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function TechName({ name }) {
  return (
    <span className="ml-1.5 inline-flex align-middle text-ttfc-dim" title={`Technical name: ${name}`}>
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}

function SettingRow({ item, meta, scope, onSaved }) {
  const toast = useToast();
  const { isManagement } = useAdmin();
  const locked = !!(meta.management || item.managementOnly) && !isManagement;
  const isSwitch = meta.type === "switch" || typeof item.default === "boolean";
  const stored = isSwitch ? item.value !== false && item.value !== "false" : String(item.value ?? "");
  const defText = String(item.default ?? "");
  const usingDefault = !isSwitch && (stored === "" || stored === defText);
  // `prefill` (multi-line lists, e.g. the waitlist page's pillars): the box starts with the default text to edit in
  // place, instead of an empty box with the default squeezed onto one placeholder line.
  const initial = isSwitch ? stored : usingDefault ? (meta.prefill ? String(meta.fallback ?? defText) : "") : stored;
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const dirty = !isSwitch && value !== initial;
  const fallback = meta.fallback ?? defText;
  const inputId = `setting-${item.key.replace(/\W/g, "-")}`;
  const descId = `${inputId}-desc`;

  const put = async (v, msg) => {
    setSaving(true); setErr("");
    try {
      await api.put(`/console/app-content/${encodeURIComponent(item.key)}`, { value: v });
      toast.success(msg || SAVED[scope]);
      onSaved(item.key, v);
      return true;
    } catch (e) { toast.error(e); setErr(e.message); return false; } finally { setSaving(false); }
  };

  const save = async (e) => {
    e?.preventDefault();
    const v = String(value).trim();
    if (v && meta.type === "email" && !EMAIL_RE.test(v)) { setErr("That doesn't look like an email address"); return; }
    if (v && meta.type === "url" && !URL_RE.test(v)) { setErr("Use a full web address starting with https://"); return; }
    await put(v);
  };

  const reset = async () => {
    if (await put("", "Back to the default")) setValue("");
  };

  let status = null;
  if (!isSwitch && !dirty) {
    if (usingDefault) {
      status = meta.emptyHides && !fallback
        ? <>Empty — {meta.type === "url" ? "no link" : "nothing is shown"}.</>
        : meta.prefill ? <>Using the default text above.</>
          : <>Using the default: <span className="text-ttfc-muted">“{clip(fallback.replace(/\n/g, " "))}”</span></>;
    } else {
      status = <>Custom{item.updatedBy ? ` · changed by ${item.updatedBy}${item.updatedAt ? `, ${when(item.updatedAt)}` : ""}` : ""}</>;
    }
  }

  const placeholder = meta.prefill ? "" : (meta.placeholder || fallback || "").replace(/\n/g, " ");
  const common = {
    id: inputId,
    value,
    "aria-describedby": descId,
    "aria-invalid": err ? true : undefined,
    placeholder,
    onChange: (e) => { setValue(e.target.value); if (err) setErr(""); },
    onKeyDown: (e) => {
      if (e.key === "Escape" && dirty) { e.preventDefault(); setValue(initial); setErr(""); }
      if (e.key === "Enter" && meta.type !== "textarea" && dirty) { e.preventDefault(); save(); }
    },
    maxLength: meta.type === "textarea" ? 2000 : 500,
    disabled: locked,
  };

  return (
    <div data-highlight={item.key} className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-8">
      <div className="min-w-0">
        {isSwitch
          ? <p className="text-sm font-semibold text-ttfc-text">{meta.label}<TechName name={item.key} />{locked && <ManagementTag />}</p>
          : <label htmlFor={inputId} className="text-sm font-semibold text-ttfc-text">{meta.label}<TechName name={item.key} />{locked && <ManagementTag />}</label>}
        <p id={descId} className="mt-0.5 text-xs leading-relaxed text-ttfc-muted">{meta.description}</p>
      </div>

      <div className="min-w-0">
        {isSwitch ? (
          <div className="flex items-center gap-3 md:justify-end">
            <span className="text-sm text-ttfc-muted">{value ? "On" : "Off"}</span>
            <Switch
              checked={!!value}
              disabled={saving || locked}
              ariaLabel={meta.label}
              onChange={async (v) => {
                setValue(v);
                const ok = await put(v, `${meta.label}: ${v ? "on" : "off"}. ${scope === "website" ? "Live on the website" : "Phones pick it up"} within about a minute`);
                if (!ok) setValue(!v);
              }}
            />
          </div>
        ) : (
          <form onSubmit={save} noValidate>
            {meta.type === "textarea"
              ? <Textarea rows={meta.rows || 3} {...common} className="text-sm" />
              : <Input type={meta.type === "email" ? "email" : meta.type === "url" ? "url" : "text"} inputMode={meta.type === "url" ? "url" : undefined} {...common} className="py-2 text-sm" />}
            {err && <p role="alert" className="mt-1.5 text-xs text-red-300">{err}</p>}
            <div className="mt-1.5 flex min-h-[28px] flex-wrap items-center gap-x-3 gap-y-1">
              {dirty ? (
                <>
                  <Button type="submit" size="sm" variant="primary" loading={saving}>Save</Button>
                  <button type="button" onClick={() => { setValue(initial); setErr(""); }} className={`rounded-md text-xs font-semibold text-ttfc-muted hover:text-ttfc-text ${focusRing}`}>Cancel</button>
                </>
              ) : (
                <>
                  <p className="min-w-0 flex-1 text-xs text-ttfc-dim">{status}</p>
                  {!usingDefault && !locked && (
                    <button type="button" onClick={reset} disabled={saving}
                      className={`inline-flex items-center gap-1 rounded-md text-xs font-semibold text-ttfc-muted hover:text-ttfc-text disabled:opacity-50 ${focusRing}`}>
                      <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset to default
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ContentSettings({ scope }) {
  const { data, error, loading, reload, setData } = useApi("/console/app-content");
  const onSaved = (key, v) => setData((xs) => (xs || []).map((x) => (x.key === key ? { ...x, value: v, updatedBy: "you", updatedAt: new Date().toISOString() } : x)));

  if (loading) return <LoadingState />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const rows = (data || []).filter((r) => !HIDDEN_KEYS.has(r.key) && scopeOf(r.key) === scope);
  if (!rows.length) {
    return <p className="text-sm text-ttfc-muted">These settings aren't available yet — the server needs the latest backend update.</p>;
  }
  // In the registry's order, so a moved switch sits where it's listed (Pass upgrades next to Ticket sales open).
  const groups = SCOPES[scope].groups.map((g) => ({ ...g, rows: rows.filter((r) => REGISTRY[r.key]?.group === g.id).sort(byRegistryOrder) }));
  const other = rows.filter((r) => !REGISTRY[r.key]);
  if (other.length) groups.push({ id: "other", title: "Other", rows: other });

  return (
    <div className="space-y-7">
      {groups.filter((g) => g.rows.length).map((g) => (
        <section key={g.id} aria-labelledby={`grp-${scope}-${g.id}`}>
          <h3 id={`grp-${scope}-${g.id}`} className="text-sm font-semibold text-ttfc-text">{g.title}</h3>
          {g.hint && <p className="mt-0.5 text-xs text-ttfc-muted">{g.hint}</p>}
          <Card className="mt-2.5 divide-y divide-ttfc-line p-0 sm:p-0">
            {g.rows.map((r) => (
              <SettingRow
                key={`${r.key}:${String(r.value)}`}
                item={r}
                scope={scope}
                meta={REGISTRY[r.key] || { label: humanize(r.key), description: "", type: typeof r.default === "boolean" ? "switch" : "text" }}
                onSaved={onSaved}
              />
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
