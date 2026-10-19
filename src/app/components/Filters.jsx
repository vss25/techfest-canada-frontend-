import { ChevronDown, Search, XCircle } from "lucide-react";
import { shortTopic } from "../lib/config";
import { IconButton } from "./ui";

/* Search field and Industry / Tech filter chips (native pickers, so they work with any phone's UI). */

export function SearchField({ value, onChange, placeholder, label }) {
  return (
    <div className="search">
      <Search aria-hidden="true" />
      <input className="input" type="search" enterKeyHint="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label || placeholder} autoCapitalize="words" autoCorrect="off" />
      {value && <span className="clear"><IconButton icon={XCircle} label="Clear search" small onClick={() => onChange("")} /></span>}
    </div>
  );
}

export function FilterSelect({ label, icon, value, options, onChange }) {
  const Icon = icon;
  const on = !!value;
  return (
    <label className={"chip chip--menu" + (on ? " chip--on" : "")} style={{ position: "relative", cursor: "pointer" }}>
      {Icon && <Icon aria-hidden="true" />}
      <span>{on ? shortTopic(value) : label}</span>
      <ChevronDown aria-hidden="true" className="chev" />
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label={on ? `${label}: ${value}` : `${label} filter`}
        style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", cursor: "pointer", fontSize: 16 }}
      >
        {/* iOS only offers "Any …" once something is picked, and ticks the current pick. */}
        <option value="">{on ? `Any ${label.toLowerCase()}` : label}</option>
        {options.map((o) => <option key={o} value={o}>{o === value ? `✓ ${o}` : o}</option>)}
      </select>
    </label>
  );
}
