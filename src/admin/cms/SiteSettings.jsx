import { useState } from "react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Card, ErrorState, LoadingState, PageHeader, Switch } from "../ui";
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

      <WebsiteOptions />
    </>
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
