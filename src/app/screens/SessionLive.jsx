import { Link, useParams } from "react-router-dom";
import { TopBar } from "../components/ui";
import ComingSoon from "../components/ComingSoon";

export default function SessionLive() {
  const { id } = useParams();
  return (
    <div className="page">
      <TopBar title="Live" />
      <main id="main" className="pad mt-16">
        <ComingSoon title="Live polls and Q&A are coming soon to the web app"
          actions={<Link to={`/session/${id}`} className="btn btn-primary">Back to the session</Link>}>
          Voting in session polls and asking the speakers questions are on their way to the web app.
        </ComingSoon>
      </main>
    </div>
  );
}
