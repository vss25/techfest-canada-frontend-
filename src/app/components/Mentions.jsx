import { Avatar } from "./ui";

/* =========================================================
   @-tagging (iOS PostMentions): the suggestion list under the text
   box (who can be tagged: lib/useMentionCandidates.js). Used by the post composer and, since
   Oct 22 2026, replies (the server accepts mentions on comments
   and tells the person tagged).
========================================================= */

export function MentionList({ suggestions, onPick }) {
  if (!suggestions.length) return null;
  return (
    <div className="mention-list" role="listbox" aria-label="Tag someone">
      {suggestions.map((x) => (
        <button key={x.type + x.id} type="button" role="option" aria-selected="false" onClick={() => onPick(x)}>
          <Avatar name={x.name} src={x.photo} size={30} round={x.type === "speaker"} />
          <span style={{ minWidth: 0 }}><b className="small" style={{ display: "block" }}>{x.name}{x.type === "speaker" ? " · Speaker" : ""}</b><span className="tiny muted ellipsis" style={{ display: "block" }}>{x.detail}</span></span>
        </button>
      ))}
    </div>
  );
}
