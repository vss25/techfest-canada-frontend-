import { TopBar } from "../components/ui";

export default function Schedule() {
  return (
    <div className="page">
      <TopBar title="Schedule" back={false} />
      <main id="main" className="pad mt-16 muted">Coming next.</main>
    </div>
  );
}
