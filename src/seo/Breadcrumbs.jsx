import { Link } from "react-router-dom";

/* A small "Home › Speakers › Name" trail (Oct 31 2026) on the nested pages that have one (the speaker profile and a
   Catalyst Awards winner's own page). crumbs: [{ path, name }] from src/seo/routes.js breadcrumbsFor, the same
   trail the page's BreadcrumbList JSON-LD describes. The last one is the page itself (not a link). "tfc-nav": the
   site's styles.css turns any other <nav> into the sticky menu bar. */
export default function Breadcrumbs({ crumbs, className, style, linkStyle, currentStyle }) {
  if (!crumbs || crumbs.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb" className={["tfc-nav", className].filter(Boolean).join(" ")} style={style}>
      <ol style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px", listStyle: "none", margin: 0, padding: 0 }}>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.path} style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {last
                ? <span aria-current="page" style={{ overflowWrap: "anywhere", ...currentStyle }}>{c.name}</span>
                : <Link to={c.path} style={{ color: "inherit", textDecoration: "none", ...linkStyle }}>{c.name}</Link>}
              {!last && <span aria-hidden="true" style={{ opacity: 0.6 }}>›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
