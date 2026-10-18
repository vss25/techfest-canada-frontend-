import { TopBar } from "../components/ui";

export default function Home() {
  return (
    <div className="page">
      <TopBar title="Home" back={false} />
      <main id="main" className="pad mt-16 muted">Coming next.</main>
    </div>
  );
}
