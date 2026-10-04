import { useState } from "react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Banner, Card, ErrorState, LoadingState, PageHeader, Switch } from "../ui";
import ContentField from "../app/ContentField";
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

/* ---------------- Website options (site.* keys in /api/console/app-content) ---------------- */
const SITE_GROUPS = [
  {
    title: "Announcement bar",
    hint: "A slim bar across the top of every page. Visitors can dismiss it; a new message shows again.",
    fields: [
      ["site.announcement", "Announcement text", "Leave empty to hide the bar.", undefined, "Early-bird pricing ends Friday!"],
      ["site.announcement_link", "Announcement link", "Optional. Full web address, starting with https://", "url", "https://thetechfestival.com/tickets"],
    ],
  },
  {
    title: "Ticket sales",
    hint: "Turning sales off disables every “Get your pass” button and the payment step. Existing tickets are unaffected.",
    fields: [
      ["site.ticket_sales_open", "Ticket sales open", "Off = buy buttons disabled and the message below is shown."],
      ["site.ticket_sales_message", "Message while sales are paused", "Shown on the Tickets and Checkout pages."],
    ],
  },
  {
    title: "Forms & pages",
    fields: [
      ["site.nominations_open", "Award nominations open", "Off = the nomination form on the Awards page is replaced by “Nominations are closed”."],
      ["site.volunteer_open", "Volunteer applications open", "Off = the volunteer form is replaced by a closed message."],
      ["site.show_agenda", "Show the agenda", "Off = Agenda is removed from the menu and the agenda pages say “Agenda coming soon”."],
      ["site.hero_tagline", "Homepage hero text", "Replaces the paragraph under the big headline on the homepage. Leave empty for the built-in text."],
    ],
  },
  {
    title: "Contact & social",
    hint: "Used in the website footer. Empty social links fall back to the built-in TTFC accounts.",
    fields: [
      ["site.contact_email", "Contact email", "Shown in the footer.", "email", "info@thetechfestival.com"],
      ["site.linkedin_url", "LinkedIn page", "Full web address, starting with https://", "url", "https://www.linkedin.com/company/…"],
      ["site.instagram_url", "Instagram", "Full web address, starting with https://", "url", "https://www.instagram.com/…"],
      ["site.x_url", "X (Twitter)", "Full web address, starting with https://", "url", "https://x.com/…"],
    ],
  },
];

function WebsiteOptions() {
  const { data, error, loading, reload, setData } = useApi("/console/app-content");
  const byKey = Object.fromEntries((data || []).map((r) => [r.key, r]));
  const onSaved = (key, v) => setData((xs) => (xs || []).map((x) => (x.key === key ? { ...x, value: v, updatedBy: "you", updatedAt: new Date().toISOString() } : x)));
  const missing = data && !data.some((r) => r.key.startsWith("site."));

  return (
    <section aria-labelledby="web-options-h">
      <h2 id="web-options-h" className="mb-1 flex items-center gap-2 text-base font-semibold"><Globe className="h-4 w-4 text-ttfc-pink" aria-hidden="true" /> Website options</h2>
      <p className="mb-4 text-sm text-ttfc-muted">Each field saves on its own. Visitors see changes within about a minute (or on their next page load).</p>
      {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : missing ? (
        <Banner tone="warn" icon={Lock} title="Website options aren't available yet">The server needs the latest backend update before these settings appear.</Banner>
      ) : (
        <div className="space-y-6">
          {SITE_GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="mb-1 text-sm font-semibold text-ttfc-text">{g.title}</h3>
              {g.hint && <p className="mb-3 text-xs text-ttfc-muted">{g.hint}</p>}
              <Card className="divide-y divide-ttfc-line p-0 sm:p-0">
                {g.fields.filter(([k]) => byKey[k]).map(([k, label, help, type, placeholder]) => (
                  <ContentField key={k} item={byKey[k]} label={label} help={help} type={type} placeholder={placeholder}
                    onSaved={onSaved} showKey={false} savedMessage="Saved — live on the website within a minute" />
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
