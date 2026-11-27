import React, { useEffect, useState } from "react";
import { ADDONS, GROUPS, ROW_COUNT, TIERS, cad, rowValues } from "./sponsorPackages";

/* Partnership packages, side by side (Nov 26 2026, the owner: "simplify how we display this... easily comparable
   between different options. Each event sponsorship page should show this").

   The sheet's 26 rows become 17 in four groups: a row that only differed by "Main Event" / "City Briefing" is one
   row, and the switch above the table says which of the two the numbers are for. An event's page opens on its own
   kind (focus). The five tiers are the columns; the single sponsorships are cards underneath. On a phone the table
   scrolls sideways with the benefit names pinned. Styles: newLook.css (.nx-pkg*). */

const act = (fn) => (e) => { if (e && e.preventDefault) e.preventDefault(); if (fn) fn(e); };
const SCOPES = [["main", "Flagship"], ["city", "City Briefings"]];

function Cell({ row, n }) {
  if (!n) return <span className="nx-pkg-no" aria-label="Not included">–</span>;
  if (row.yes) return <span className="nx-pkg-yes" aria-label="Included">✓</span>;
  return <b>{n}</b>;
}

export default function SponsorCompare({ focus = "main", id = "packages", compact = false, onEnquire, enquireLabel = "Enquire about a package", onCall }) {
  const [scope, setScope] = useState(focus === "city" ? "city" : "main");
  const [open, setOpen] = useState(!compact);
  useEffect(() => { setScope(focus === "city" ? "city" : "main"); }, [focus]);   // another event's page: its own kind first
  const shown = GROUPS.map((g) => ({ ...g, rows: open ? g.rows : g.rows.filter((r) => r.key) })).filter((g) => g.rows.length);
  return (
    <section className="nx-s nx-pkg" id={id} aria-label="Partnership packages"><div className="nx-wrap">
      <div className="nx-head"><div>
        {compact ? null : <span className="nx-label">Partnership packages · 2027</span>}
        <h2 className="nx-h2">Compare <em>packages</em></h2>
        <p className="nx-lead">One package covers the whole 2027 season: the Flagship in Toronto and the five City Briefings.</p>
      </div></div>

      <div className="nx-pkg-bar">
        <span>Show what you get at</span>
        <div className="nx-pkg-switch" role="group" aria-label="Show what you get at">
          {SCOPES.map(([k, label]) => (
            <button key={k} type="button" className={scope === k ? "on" : ""} aria-pressed={scope === k} onClick={() => setScope(k)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="nx-pkg-scroll" tabIndex={0} role="region" aria-label="Package comparison table">
        <table className="nx-pkg-table">
          <thead><tr>
            <th scope="col" className="nx-pkg-corner">{scope === "city" ? "Across the five City Briefings" : "At the Flagship"}</th>
            {TIERS.map((t) => (
              <th key={t.id} scope="col">
                <span className="nx-pkg-name">{t.name}</span>
                <span className="nx-pkg-price">{cad(t.price)}</span>
                <span className="nx-pkg-left">{t.available} available</span>
              </th>
            ))}
          </tr></thead>
          {shown.map((g) => (
            <tbody key={g.name}>
              <tr className="nx-pkg-group"><th scope="rowgroup" colSpan={TIERS.length + 1}>{g.name}</th></tr>
              {g.rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}{r.note ? <small>{r.note}</small> : null}</th>
                  {rowValues(r, scope).map((n, i) => <td key={TIERS[i].id}><Cell row={r} n={n} /></td>)}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="nx-pkg-fine">Prices in CAD, before tax. City Briefing numbers are season totals across the five briefings.</p>

      <div className="nx-pkg-actions">
        {!open ? <button type="button" className="nx-btn nx-pkg-ghost" onClick={() => setOpen(true)}>Show all {ROW_COUNT} benefits</button> : null}
        {onEnquire ? <a href="#" className="nx-btn nx-buy" onClick={act(onEnquire)}>{enquireLabel}</a> : null}
        {onCall ? <a href="#" className="nx-btn nx-pkg-ghost" onClick={act(onCall)}>Book a 30-minute call</a> : null}
        <a className="nx-pkg-mail" href="mailto:sales@thetechfestival.com">sales@thetechfestival.com</a>
      </div>

      {open ? (
        <>
          <h3 className="nx-pkg-h3">Single sponsorships</h3>
          <div className="nx-pkg-addons">
            {ADDONS.map((a) => (
              <div key={a.name} className="nx-pkg-addon">
                <strong>{a.name}</strong>
                <span className="nx-pkg-price">{cad(a.price)}</span>
                <span className="nx-pkg-left">{a.available ? `${a.available} available` : a.left}</span>
                <ul>{a.points.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div></section>
  );
}
