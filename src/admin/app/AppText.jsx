import { Sparkles } from "lucide-react";
import { Banner, PageHeader } from "../ui";
import ContentSettings from "../content/ContentSettings";

export default function AppText() {
  return (
    <>
      <PageHeader eyebrow="App" title="App text & switches" description="Change the words people see in the TTFC app and turn features on or off." />
      <Banner tone="info" icon={Sparkles} className="mb-6">
        Changes reach phones within about a minute of opening the app — no App Store update needed. Empty fields use the built-in text.
      </Banner>
      <ContentSettings scope="app" />
    </>
  );
}
