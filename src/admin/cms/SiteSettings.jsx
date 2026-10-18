import { useState } from "react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Button, Card, ErrorState, Input, LoadingState, PageHeader, Switch } from "../ui";
import ContentSettings from "../content/ContentSettings";
import { Globe, Lock } from "lucide-react";
import { LIVE_NOTE } from "./cmsMeta";
import useCmsStatus from "./useCmsStatus";

const SETTINGS = [
  {
    key: "speakersEnabled",
    label: "Show the Featured Speakers section",
    description: "On: the speakers section is shown on the website. Off: visitors see a “Coming soon” message instead.",
  },
  {
    key: "attendeesCarouselEnabled",
    label: "Show the Featured Attendees carousel",
    description: "On: the attendees carousel is shown on the website. Off: visitors see a “Coming soon” message instead.",
  },
];

export default function SiteSettings() {
  const toast = useToast();
  const { configured } = useCmsStatus();
  const readOnly = configured === false;
  const { data, error, loading, reload, setData } = useApi("/cms/siteSettings");
  const [busy, setBusy] = useState("");
  const doc = data?.[0] || null;

  const toggle = async (key, value) => {
    setBusy(key);
    const prev = data;
    setData(doc ? [{ ...doc, [key]: value }, ...data.slice(1)] : [{ [key]: value }]);
    try {
      if (doc?._id) await api.patch(`/cms/siteSettings/${doc._id}`, { [key]: value });
      else {
        const saved = await api.post("/cms/siteSettings", { [key]: value });
        setData([saved]);
      }
      toast.success(`${value ? "Turned on" : "Turned off"}. ${LIVE_NOTE}`);
    } catch (err) {
      setData(prev);
      toast.error(err);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <PageHeader eyebrow="Website content" title="Site settings" description="Switch parts of the website on or off and edit site-wide text. Every change saves on its own and reaches the website within about a minute." />

      <section aria-labelledby="sections-h" className="mb-10">
        <h2 id="sections-h" className="mb-1 text-base font-semibold">Homepage sections</h2>
        <p className="mb-4 text-sm text-ttfc-muted">Stored in Sanity. Saves as soon as you flip a switch.</p>
        {configured === false && (
          <Banner tone="warn" icon={Lock} className="mb-4 max-w-2xl" title="Read-only for now">
            Editing is read-only until SANITY_WRITE_TOKEN is added on Render.
          </Banner>
        )}
        {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
          <Card className="max-w-2xl divide-y divide-ttfc-line p-0 sm:p-0">
            {SETTINGS.map((s) => (
              <div key={s.key} className="p-5 sm:p-6">
                <Switch
                  size="lg"
                  label={s.label}
                  description={s.description}
                  checked={!!doc?.[s.key]}
                  disabled={readOnly || busy === s.key}
                  onChange={(v) => toggle(s.key, v)}
                />
              </div>
            ))}
          </Card>
        )}
      </section>

      <AboutNumbers readOnly={readOnly} />

      <WebsiteOptions />
    </>
  );
}

/* The numbers on the About page (Sanity `aboutContent.stats`): value, suffix and label. */
function AboutNumbers({ readOnly }) {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi("/cms/aboutContent");
  const doc = data?.[0] || null;
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const stats = draft ?? (doc?.stats || []);
  const change = (i, key) => (e) => setDraft(stats.map((s, j) => (j === i ? { ...s, [key]: e.target.value } : s)));
  const invalid = stats.some((s) => !String(s.label || "").trim() || s.value === "" || !Number.isFinite(Number(s.value)));

  const save = async () => {
    setSaving(true);
    try {
      const body = { stats: stats.map((s) => ({ ...s, label: String(s.label).trim(), value: Number(s.value), suffix: String(s.suffix || "").trim() })) };
      const saved = await api.patch(`/cms/aboutContent/${doc._id}`, body);
      setData([{ ...doc, stats: saved?.stats || body.stats }, ...data.slice(1)]);
      setDraft(null);
      toast.success(`Saved. ${LIVE_NOTE}`);
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="about-numbers-h" className="mb-10">
      <h2 id="about-numbers-h" className="mb-1 text-base font-semibold">About page numbers</h2>
      <p className="mb-4 text-sm text-ttfc-muted">The figures in the About section, for example 1000+ attendees across 2 days. Stored in Sanity.</p>
      {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !doc ? (
        <Card className="max-w-2xl"><p className="text-sm text-ttfc-muted">There's no About content in the CMS yet.</p></Card>
      ) : (
        <Card className="max-w-2xl">
          <div className="hidden grid-cols-[6rem_4rem_1fr] gap-3 pb-2 text-[13px] font-semibold text-ttfc-text/90 sm:grid" aria-hidden="true">
            <span>Number</span><span>After it</span><span>Label</span>
          </div>
          <div className="flex flex-col gap-3">
            {stats.map((s, i) => (
              <div key={s._key || i} className="grid grid-cols-[6rem_4rem_1fr] gap-3">
                <Input type="number" min="0" inputMode="numeric" value={s.value ?? ""} onChange={change(i, "value")} disabled={readOnly || saving}
                  aria-label={`Number ${i + 1}`} />
                <Input value={s.suffix || ""} maxLength={4} onChange={change(i, "suffix")} disabled={readOnly || saving}
                  aria-label={`What follows number ${i + 1}, for example +`} placeholder="+" />
                <Input value={s.label || ""} maxLength={60} onChange={change(i, "label")} disabled={readOnly || saving}
                  aria-label={`Label for number ${i + 1}`} />
              </div>
            ))}
          </div>
          {draft && (
            <div className="mt-4 flex items-center justify-end gap-2">
              {invalid && <p className="mr-auto text-xs text-red-300" role="alert">Every number needs a value and a label.</p>}
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={save} loading={saving} disabled={invalid || readOnly}>Save</Button>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}

function WebsiteOptions() {
  return (
    <section aria-labelledby="web-options-h">
      <h2 id="web-options-h" className="mb-1 flex items-center gap-2 text-base font-semibold"><Globe className="h-4 w-4 text-ttfc-pink" aria-hidden="true" /> Website options</h2>
      <p className="mb-5 text-sm text-ttfc-muted">
        Switches save as soon as you flip them; text fields show a small Save button once you change them. Visitors see changes within about a minute. Empty fields use the built-in text.
      </p>
      <ContentSettings scope="website" />
    </section>
  );
}
