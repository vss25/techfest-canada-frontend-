import { Fragment, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Printer, Sun } from "lucide-react";
import "./FactSheet.css";
import { FACT_SHEET } from "../data/factSheet";

/* =========================================================
   The TTFC 2026 fact sheet: an UNLISTED page (Oct 23 2026).
   Reached only from its direct link, /fact-sheet/<token>
   (src/lib/factSheetRoute.js); see there for how it's kept out of
   sight. A single document page in the site's look (Orbitron headings,
   Montserrat text, the purple → magenta → orange brand gradient,
   the site's light / dark choice with its own toggle), with no
   navbar, footer, ticket bar or banners to wander off through: just
   the logo (back to the homepage) and "Print / Save as PDF". The
   print stylesheet (FactSheet.css) drops the buttons and the dark
   theme and prints on two A4 or Letter pages.
   The text is src/data/factSheet.js.
========================================================= */

const setMeta = (name, content) => {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  const created = !el;
  const before = el?.getAttribute("content");
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.append(el); }
  el.setAttribute("content", content);
  return () => { if (created) el.remove(); else el.setAttribute("content", before ?? ""); };
};

/* Print margins, only while this page is open (an @page rule in FactSheet.css would stay for every page after). */
const PRINT_PAGE = "@media print { @page { margin: 12mm 13mm 13mm; } }";

const readTheme = () => { try { return localStorage.getItem("theme") === "dark" ? "dark" : "light"; } catch { return "light"; } };

/* The site's light / dark choice, as the navbar keeps it (localStorage "theme", body.dark-mode). */
function useSiteTheme() {
  const [theme, setTheme] = useState(readTheme);
  useLayoutEffect(() => {
    document.body.classList.toggle("dark-mode", theme === "dark");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", next); } catch { /* storage blocked: this visit only */ }
    setTheme(next);
  };
  return [theme, toggle];
}

/* Out of search engines while open, the short title (also the PDF's file name), no bottom padding for the ticket bar. */
function useUnlistedPage() {
  useLayoutEffect(() => {
    const title = document.title;
    document.title = "TTFC 2026 Fact Sheet";
    const undoRobots = setMeta("robots", "noindex, nofollow, noarchive");
    document.body.classList.add("fs-open");
    return () => {
      undoRobots();
      document.title = title;
      document.body.classList.remove("fs-open");
    };
  }, []);
}

/* An email address may wrap after the @ on a phone, never mid-word. */
function linkText(part) {
  if (!part.href.startsWith("mailto:")) return part.a;
  const at = part.a.indexOf("@");
  return <>{part.a.slice(0, at + 1)}<wbr />{part.a.slice(at + 1)}</>;
}

function Rich({ value }) {
  if (typeof value === "string") return value;
  return value.map((part, i) => {
    if (typeof part === "string") return <Fragment key={i}>{part}</Fragment>;
    if (part.b) return <strong key={i}>{part.b}</strong>;
    return <a key={i} href={part.href}>{linkText(part)}</a>;
  });
}

function Block({ block, label }) {
  if (block.p) return <p><Rich value={block.p} /></p>;
  if (block.note) return <p className="fs-note"><Rich value={block.note} /></p>;
  if (block.ul) {
    return (
      <ul className={`fs-bullets${block.ul.every((item) => typeof item === "string") ? " fs-bullets-short" : ""}`}>
        {block.ul.map((item, i) => <li key={i}><Rich value={item} /></li>)}
      </ul>
    );
  }
  if (block.lists) {
    return (
      <div className="fs-lists">
        {block.lists.map((list) => (
          <div key={list.title} className="fs-list">
            <h3>{list.title}</h3>
            <ol>{list.items.map((item) => <li key={item}>{item}</li>)}</ol>
          </div>
        ))}
      </div>
    );
  }
  if (block.table) {
    return (
      <div className="fs-table-wrap">
        <table className="fs-table" aria-label={label}>
          {block.head && (
            <thead><tr><th scope="col">{block.head[0]}</th><th scope="col">{block.head[1]}</th></tr></thead>
          )}
          <tbody>
            {block.table.map(([key, value]) => (
              <tr key={key}><th scope="row">{key}</th><td><Rich value={value} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

export default function FactSheet() {
  useUnlistedPage();
  const [theme, toggleTheme] = useSiteTheme();
  const dark = theme === "dark";

  return (
    <div className="fs-root">
      <style>{PRINT_PAGE}</style>
      <main className="fs-sheet">
        <header className="fs-masthead">
          <Link to="/" className="fs-logo" aria-label="The Tech Festival Canada home page">
            <img className="fs-logo-light" src="/Tech_Festival_Canada_Logo_Light_Transparent.webp" alt="" width="1080" height="675" />
            <img className="fs-logo-dark" src="/Tech_Festival_Canada_Logo_Dark_Transparent.webp" alt="" width="1500" height="938" />
          </Link>
          <div className="fs-actions">
            <button type="button" className="fs-icon-btn" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
              {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <button type="button" className="fs-print-btn" onClick={() => window.print()}>
              <Printer size={17} aria-hidden="true" /> Print / Save as PDF
            </button>
          </div>
        </header>

        <div className="fs-title">
          <h1>{FACT_SHEET.title}</h1>
          <p className="fs-tagline">{FACT_SHEET.tagline}</p>
        </div>

        {FACT_SHEET.sections.map((section) => (
          <section key={section.id} className={`fs-section fs-section-${section.id}`} aria-labelledby={`fs-${section.id}`}>
            <h2 id={`fs-${section.id}`}>{section.title}</h2>
            {section.blocks.map((block, i) => <Block key={i} block={block} label={section.title} />)}
          </section>
        ))}

        <p className="fs-footer">{FACT_SHEET.preparedBy}</p>
      </main>
    </div>
  );
}
