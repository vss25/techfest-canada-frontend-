import { TopBar } from "../components/ui";
import ComingSoon from "../components/ComingSoon";
import SpeakersList from "../components/SpeakersList";

/* Network, first web release: the speakers; the attendee network follows. */

export default function Network() {
  return (
    <div className="page">
      <TopBar title="Network" back={false} />
      <main id="main" className="mt-16 stack-lg">
        <div className="pad">
          <ComingSoon title="The attendee network is coming soon to the web app" actions={null}>
            Recommended people, the attendee list, exhibitors and staff, with connect and message, are on their way. Meanwhile, here are the speakers.
          </ComingSoon>
        </div>
        <section aria-label="Speakers" className="stack-sm">
          <h2 className="section-title pad">Speakers</h2>
          <SpeakersList />
        </section>
      </main>
    </div>
  );
}
