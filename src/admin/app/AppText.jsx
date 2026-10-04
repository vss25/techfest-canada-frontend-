import { useState } from "react";
import { RotateCcw, Save, Sparkles } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Button, Card, ErrorState, LoadingState, PageHeader, Switch, Textarea } from "../ui";
import { when } from "../format";

/* Friendly names for the keys in backend services/adminHelpers.js → CONTENT_KEYS. Unknown keys fall back to the key. */
const LABELS = {
  "login.tagline": ["Sign-in screen tagline", "The line under the logo on the sign-in screen."],
  "welcome.subtitle": ["Welcome subtitle", "Shown under “Welcome” after signing in."],
  "home.announcement": ["Home announcement banner", "A banner at the top of Home. Leave empty to hide it."],
  "home.announcement_link": ["Announcement link", "Optional link opened when the banner is tapped."],
  "home.spotlight_title": ["Home: spotlight heading", ""],
  "home.partners_title": ["Home: partners heading", ""],
  "feed.empty": ["Empty feed message", "Shown when nobody has posted yet."],
  "network.empty": ["Empty network message", "Shown when someone has no connections yet."],
  "schedule.title": ["Schedule screen title", ""],
  "ticket.help": ["Ticket help text", "Helps people link a ticket bought with another email."],
  "support.email": ["Support email", "Where the app sends people who need help."],
  "privacy.notice": ["Privacy notice", "Explains what the app records."],
  "community.rules": ["Community rules", "Shown before people post."],
  "flag.show_partners": ["Show partners on Home", ""],
  "flag.show_news": ["Show the news feed", ""],
  "flag.allow_posts": ["Allow people to post", "Turn off to pause all new posts."],
  "flag.allow_groups": ["Allow groups", "Turn off to hide community groups."],
};

function Row({ item, onSaved }) {
  const toast = useToast();
  const [label, help] = LABELS[item.key] || [item.key, ""];
  const isBool = typeof item.default === "boolean";
  const [value, setValue] = useState(isBool ? !!item.value : String(item.value ?? ""));
  const [saving, setSaving] = useState(false);
  const dirty = isBool ? value !== !!item.value : value !== String(item.value ?? "");

  const save = async (v = value) => {
    setSaving(true);
    try {
      await api.put(`/console/app-content/${encodeURIComponent(item.key)}`, { value: v });
      toast.success("Saved — live in the app within a minute");
      onSaved(item.key, v);
    } catch (err) {
      toast.error(err);
      if (isBool) setValue(!!item.value);
    } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-3 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-8">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ttfc-text">{label}</p>
        {help && <p className="mt-0.5 text-xs text-ttfc-muted">{help}</p>}
        <p className="mt-1.5 font-mono text-[11px] text-ttfc-dim">{item.key}</p>
        <p className="mt-1 text-[11px] text-ttfc-dim">{item.updatedBy ? `Changed by ${item.updatedBy} · ${when(item.updatedAt)}` : "Using the default"}</p>
      </div>
      {isBool ? (
        <div className="flex items-center gap-3">
          <Switch checked={value} disabled={saving} ariaLabel={label} onChange={(v) => { setValue(v); save(v); }} />
          <span className="text-sm text-ttfc-muted">{value ? "On" : "Off"}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea rows={Math.min(6, Math.max(2, Math.ceil(value.length / 70)))} value={value} onChange={(e) => setValue(e.target.value)} aria-label={label} maxLength={2000} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" icon={Save} disabled={!dirty} loading={saving} onClick={() => save()}>Save</Button>
            {dirty && <Button size="sm" variant="ghost" onClick={() => setValue(String(item.value ?? ""))}>Undo</Button>}
            {value !== String(item.default ?? "") && (
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => setValue(String(item.default ?? ""))}>Use default</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppText() {
  const { data, error, loading, reload, setData } = useApi("/console/app-content");
  const onSaved = (key, v) => setData((xs) => (xs || []).map((x) => (x.key === key ? { ...x, value: v, updatedBy: "you", updatedAt: new Date().toISOString() } : x)));
  const flags = (data || []).filter((x) => typeof x.default === "boolean");
  const texts = (data || []).filter((x) => typeof x.default !== "boolean");
  return (
    <>
      <PageHeader eyebrow="App" title="App text & switches" description="Change words in the app and turn features on or off." />
      <Banner tone="info" icon={Sparkles} className="mb-6">Phones pick up changes within a minute of opening the app — no App Store update needed.</Banner>
      {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="space-y-6">
          {!!flags.length && (
            <section>
              <h2 className="mb-3 text-base font-semibold">Switches</h2>
              <Card className="divide-y divide-ttfc-line p-0 sm:p-0">{flags.map((it) => <Row key={it.key} item={it} onSaved={onSaved} />)}</Card>
            </section>
          )}
          {!!texts.length && (
            <section>
              <h2 className="mb-3 text-base font-semibold">Text</h2>
              <Card className="divide-y divide-ttfc-line p-0 sm:p-0">{texts.map((it) => <Row key={it.key} item={it} onSaved={onSaved} />)}</Card>
            </section>
          )}
        </div>
      )}
    </>
  );
}
