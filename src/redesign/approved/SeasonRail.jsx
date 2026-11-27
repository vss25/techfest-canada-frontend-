import React, { useEffect, useRef } from "react";

/* The season timeline (the "new look", Nov 25 2026): directly under each page's hero, never above it.
   stops come from src/lib/seasonRail.js; go = { van: fn, … } (the board's goCity), goPast for Toronto 2026,
   here = the city whose page this is. On a narrow screen it scrolls itself (not the page) to the next event.
   Styles: .nl-rail in siteLook.css (and its dark colours in siteDark.css). */
export default function SeasonRail({ stops, go, goPast, here, phone }) {
  const box = useRef(null);
  useEffect(() => {
    const el = box.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const next = el.querySelector(".nl-stop.next");
    if (!next) return;
    const x = next.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
    el.scrollLeft = Math.max(0, x - (phone ? 24 : 90));
  }, [stops, phone]);
  if (!stops || !stops.length) return null;
  return (
    <nav className={`nl-rail${phone ? " nl-rail-phone" : ""}`} aria-label="The 2027 season">
      <div className="nl-rail-in" ref={box}>
        <ol className="nl-stops">
          {stops.map((s) => {
            const onClick = s.id === "past" ? goPast : go && go[s.id];
            return (
              <React.Fragment key={s.id}>
              <li>
                <a href="#" onClick={onClick} className={`nl-stop ${s.state}${here && here === s.id ? " here" : ""}`}
                  aria-current={here && here === s.id ? "page" : undefined}>
                  <i className="nl-pt" aria-hidden="true" />
                  <span><b>{s.name}</b><small>{s.when}</small></span>
                </a>
              </li>
              {/* The owner, Nov 27 2026: "2027 season" sits after last year's stop, where the season starts. */}
              {s.id === "past" ? <li className="nl-rail-sep" aria-hidden="true"><span>2027 season</span></li> : null}
              </React.Fragment>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
