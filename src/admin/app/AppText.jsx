import { Sparkles } from "lucide-react";
import { useApi } from "../hooks";
import { Banner, Card, ErrorState, LoadingState, PageHeader } from "../ui";
import ContentField from "./ContentField";

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

export default function AppText() {
  const { data, error, loading, reload, setData } = useApi("/console/app-content");
  const onSaved = (key, v) => setData((xs) => (xs || []).map((x) => (x.key === key ? { ...x, value: v, updatedBy: "you", updatedAt: new Date().toISOString() } : x)));
  // Website keys (site.*) live under Website content → Site settings.
  const appRows = (data || []).filter((x) => !x.key.startsWith("site."));
  const flags = appRows.filter((x) => typeof x.default === "boolean");
  const texts = appRows.filter((x) => typeof x.default !== "boolean");
  return (
    <>
      <PageHeader eyebrow="App" title="App text & switches" description="Change words in the app and turn features on or off." />
      <Banner tone="info" icon={Sparkles} className="mb-6">Phones pick up changes within a minute of opening the app — no App Store update needed.</Banner>
      {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="space-y-6">
          {!!flags.length && (
            <section>
              <h2 className="mb-3 text-base font-semibold">Switches</h2>
              <Card className="divide-y divide-ttfc-line p-0 sm:p-0">{flags.map((it) => <ContentField key={it.key} item={it} label={(LABELS[it.key] || [it.key])[0]} help={(LABELS[it.key] || [])[1]} onSaved={onSaved} />)}</Card>
            </section>
          )}
          {!!texts.length && (
            <section>
              <h2 className="mb-3 text-base font-semibold">Text</h2>
              <Card className="divide-y divide-ttfc-line p-0 sm:p-0">{texts.map((it) => <ContentField key={it.key} item={it} label={(LABELS[it.key] || [it.key])[0]} help={(LABELS[it.key] || [])[1]} onSaved={onSaved} />)}</Card>
            </section>
          )}
        </div>
      )}
    </>
  );
}
