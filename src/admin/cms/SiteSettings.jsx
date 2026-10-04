import { useState } from "react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Card, ErrorState, LoadingState, PageHeader, Switch } from "../ui";
import { CmsBanners } from "./CmsParts";
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
      <PageHeader eyebrow="Website content" title="Site settings" description="Switch website sections on or off. Changes save as soon as you flip a switch." />
      <CmsBanners configured={configured} />
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
    </>
  );
}
