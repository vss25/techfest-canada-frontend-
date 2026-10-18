import { useParams } from "react-router-dom";
import { TopBar } from "../components/ui";
import { EFFECTIVE, LEGAL } from "../lib/legal";

export default function Legal() {
  const { doc } = useParams();
  const d = LEGAL[doc] || LEGAL.privacy;
  return (
    <div className="page page--bare">
      <TopBar title={d.title} />
      <main id="main" className="pad mt-16 stack-lg" style={{ maxWidth: 680 }}>
        <div>
          <h1 className="page-title">{d.title}</h1>
          <p className="muted small" style={{ margin: "6px 0 0" }}>The Tech Festival Canada app · Effective {EFFECTIVE}</p>
        </div>
        <p className="muted" style={{ margin: 0 }}>{d.intro}</p>
        {d.sections.map((s) => (
          <section key={s.title} className="stack-sm">
            <h2 style={{ fontSize: 16, margin: 0 }}>{s.title}</h2>
            <p className="muted" style={{ margin: 0 }}>{s.body}</p>
            {s.bullets && (
              <ul className="muted" style={{ margin: 0, paddingLeft: 20 }}>
                {s.bullets.map((b) => <li key={b} style={{ marginBottom: 4 }}>{b}</li>)}
              </ul>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
