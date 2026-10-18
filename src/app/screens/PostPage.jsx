import { TopBar } from "../components/ui";

export default function PostPage() {
  return (
    <div className="page">
      <TopBar title="PostPage" back={false} />
      <main id="main" className="pad mt-16 muted">Coming next.</main>
    </div>
  );
}
