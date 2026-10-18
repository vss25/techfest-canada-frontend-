import { TopBar } from "../components/ui";
import ComingSoon from "../components/ComingSoon";

export default function PersonProfile() {
  return (
    <div className="page">
      <TopBar title="Profile" />
      <main id="main" className="pad mt-16">
        <ComingSoon title="Attendee profiles are coming soon to the web app">Connecting and messaging other attendees is on its way to the web app.</ComingSoon>
      </main>
    </div>
  );
}
