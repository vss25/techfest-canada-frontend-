import { TopBar } from "../components/ui";

export default function Profile() {
  return (
    <div className="page">
      <TopBar title="Profile" back={false} />
      <main id="main" className="pad mt-16 muted">Coming next.</main>
    </div>
  );
}
