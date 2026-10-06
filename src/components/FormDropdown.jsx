import { useEffect, useRef, useState } from "react";

/* The dropdown used on the website's attendee forms (checkout and
   "complete your profile"): single or multi select, optional search,
   priority options on top (e.g. Canada first), light/dark aware. */

function ChevronDown({ color, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform 0.2s ease" }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function TickSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* ============================================================
   CUSTOM DROPDOWN
   ============================================================ */
export function CustomDropdown({ options, value, onChange, placeholder="Select…", multi=false, searchable=false, dark, error, maxHeight=220, priorityOptions=[], flagMap={} }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const textMain = dark ? "#ffffff" : "#0d0520";
  const textMuted = dark ? "rgba(255,255,255,0.55)" : "rgba(13,5,32,0.55)";
  const inputBg = dark ? "rgba(255,255,255,0.06)" : "rgba(122,63,209,0.04)";
  const borderColor = error ? "#e05555" : open ? "#7a3fd1" : dark ? "rgba(255,255,255,0.14)" : "rgba(122,63,209,0.22)";
  const dropBg = dark ? "#16092e" : "#ffffff";
  const hoverBg = dark ? "rgba(122,63,209,0.18)" : "rgba(122,63,209,0.07)";
  const selectedBg = dark ? "rgba(122,63,209,0.28)" : "rgba(122,63,209,0.12)";
  const dividerColor = dark ? "rgba(255,255,255,0.07)" : "rgba(122,63,209,0.10)";

  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) { setOpen(false); setSearch(""); } };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, []);

  useEffect(() => { if (open && searchable && searchRef.current) setTimeout(() => searchRef.current?.focus(), 60); }, [open, searchable]);

  const isSelected = (opt) => multi ? Array.isArray(value) && value.includes(opt) : value === opt;

  const handleSelect = (opt) => {
    if (multi) { const arr = Array.isArray(value) ? value : []; onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]); }
    else { onChange(opt); setOpen(false); setSearch(""); }
  };

  const removeTag = (e, opt) => { e.stopPropagation(); if (multi && Array.isArray(value)) onChange(value.filter(x => x !== opt)); };

  const filteredOptions = options.filter(o => !search || o.toLowerCase().includes(search.toLowerCase()));
  const filteredPriority = priorityOptions.filter(o => !search || o.toLowerCase().includes(search.toLowerCase()));
  const filteredRest = filteredOptions.filter(o => !priorityOptions.includes(o));
  const singleLabel = !multi && value ? (flagMap[value] ? flagMap[value]+" "+value : value) : null;
  const tags = multi && Array.isArray(value) ? value : [];

  return (
    <div ref={containerRef} style={{ position:"relative", userSelect:"none" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding: multi && tags.length > 0 ? "8px 12px" : "11px 14px", borderRadius:10, border:"1px solid "+borderColor, background:inputBg, cursor:"pointer", gap:8, transition:"border-color 0.2s, box-shadow 0.2s", boxShadow: open ? "0 0 0 3px "+(dark?"rgba(122,63,209,0.20)":"rgba(122,63,209,0.12)") : "none", minHeight:44 }}>
        <div style={{ flex:1, display:"flex", flexWrap:"wrap", gap:6, alignItems:"center", minWidth:0 }}>
          {multi && tags.length > 0 ? tags.map(tag => (
            <span key={tag} style={{ display:"inline-flex", alignItems:"center", gap:5, background: dark?"rgba(122,63,209,0.30)":"rgba(122,63,209,0.12)", color: dark?"#c8a8ff":"#6a30c0", border:"1px solid "+(dark?"rgba(122,63,209,0.45)":"rgba(122,63,209,0.28)"), borderRadius:6, padding:"3px 8px", fontSize:"0.70rem", fontWeight:700, letterSpacing:"0.3px", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              <span style={{ overflow:"hidden", textOverflow:"ellipsis" }}>{tag}</span>
              <span onClick={(e) => removeTag(e, tag)} style={{ cursor:"pointer", opacity:0.7, lineHeight:1, flexShrink:0, fontSize:"0.9rem" }}>&times;</span>
            </span>
          )) : (
            <span style={{ fontSize:"16px", color:(multi?tags.length===0:!value)?textMuted:textMain, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{multi ? placeholder : (singleLabel || placeholder)}</span>
          )}
        </div>
        <span style={{ transform: open?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s ease", flexShrink:0 }}><ChevronDown color={textMuted} /></span>
      </div>

      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:dropBg, border:"1px solid "+(dark?"rgba(122,63,209,0.35)":"rgba(122,63,209,0.18)"), borderRadius:12, zIndex:9999, boxShadow: dark?"0 12px 48px rgba(0,0,0,0.55)":"0 12px 40px rgba(122,63,209,0.14)", overflow:"hidden" }}>
          {searchable && (
            <div style={{ padding:"10px 10px 6px", borderBottom:"1px solid "+dividerColor }}>
              <div style={{ position:"relative" }}>
                <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", opacity:0.4 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={textMain} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ width:"100%", padding:"8px 10px 8px 30px", borderRadius:8, border:"1px solid "+dividerColor, background: dark?"rgba(255,255,255,0.05)":"rgba(122,63,209,0.04)", color:textMain, fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
              </div>
            </div>
          )}

          {multi && (
            <div style={{ padding:"8px 12px", fontSize:"0.60rem", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color: dark?"rgba(245,166,35,0.8)":"#d98a14", borderBottom:"1px solid "+dividerColor, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>{Array.isArray(value)?value.length:0} selected</span>
              {Array.isArray(value) && value.length > 0 && <span onClick={(e)=>{e.stopPropagation();onChange([]);}} style={{ cursor:"pointer", opacity:0.7, fontSize:"0.60rem", color:"#e05555" }}>Clear all</span>}
            </div>
          )}

          <div style={{ overflowY:"auto", maxHeight, WebkitOverflowScrolling:"touch" }}>
            {filteredPriority.length > 0 && (<>
              {filteredPriority.map(opt => <DropOption key={opt} opt={opt} label={flagMap[opt]?flagMap[opt]+" "+opt:opt} selected={isSelected(opt)} multi={multi} dark={dark} hoverBg={hoverBg} selectedBg={selectedBg} textMain={textMain} textMuted={textMuted} onSelect={handleSelect} />)}
              {filteredRest.length > 0 && <div style={{ height:1, background:dividerColor, margin:"2px 0" }} />}
            </>)}
            {(priorityOptions.length > 0 ? filteredRest : filteredOptions).map(opt => <DropOption key={opt} opt={opt} label={flagMap[opt]?flagMap[opt]+" "+opt:opt} selected={isSelected(opt)} multi={multi} dark={dark} hoverBg={hoverBg} selectedBg={selectedBg} textMain={textMain} textMuted={textMuted} onSelect={handleSelect} />)}
            {filteredOptions.length === 0 && filteredPriority.length === 0 && <div style={{ padding:"14px 16px", fontSize:"0.78rem", color:textMuted, textAlign:"center" }}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function DropOption({ opt, label, selected, multi, dark, hoverBg, selectedBg, textMain, onSelect }) {
  return (
    <div onClick={() => onSelect(opt)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer", background: selected?selectedBg:"transparent", fontSize:"14px", color: selected?(dark?"#c8a8ff":"#6a30c0"):textMain, fontWeight: selected?600:400, transition:"background 0.12s" }}
      onMouseEnter={e => { if(!selected) e.currentTarget.style.background = hoverBg; }}
      onMouseLeave={e => { e.currentTarget.style.background = selected?selectedBg:"transparent"; }}>
      {multi && <div style={{ width:18, height:18, borderRadius:5, flexShrink:0, border:"2px solid "+(selected?"#7a3fd1":(dark?"rgba(255,255,255,0.20)":"rgba(122,63,209,0.30)")), background: selected?"#7a3fd1":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.12s" }}>{selected && <TickSmall />}</div>}
      {!multi && selected && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={dark?"#c8a8ff":"#7a3fd1"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><path d="M20 6 9 17l-5-5" /></svg>}
      {!multi && !selected && <div style={{ width:13, flexShrink:0 }} />}
      <span style={{ flex:1 }}>{label}</span>
    </div>
  );
}
