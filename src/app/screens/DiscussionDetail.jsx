import { TopBar } from "../components/ui";
import ComingSoon from "../components/ComingSoon";

export default function DiscussionDetail() {
  return (
    <div className="page">
      <TopBar title="Chats" back={true} />
      <main id="main" className="pad mt-16">
        <ComingSoon title="Chats are coming soon to the web app">Messages, group chats and discussions are on their way to the web app.</ComingSoon>
      </main>
    </div>
  );
}
