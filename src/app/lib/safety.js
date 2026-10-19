import { Flag, Hand } from "lucide-react";
import { blockUser, report } from "./social";
import { chooseDialog, confirmDialog, givenName, showAlert } from "./ui";

/* =========================================================
   Report and Block (iOS SafetyMenu): the reasons sheet and
   the block confirmation, with the iOS copy. Used on
   profiles, chats, groups, discussions and posts.
========================================================= */

const REASONS = ["Spam or scam", "Harassment or hate", "Sexual or violent content", "False information", "Something else"];

/** "Why are you reporting this?" → report(type, id, reason). */
export async function reportFlow(type, id) {
  const reason = await chooseDialog({ title: "Why are you reporting this?", options: REASONS.map((r) => ({ label: r })) });
  if (!reason) return;
  const ok = await report(type, id, reason);
  showAlert(ok ? "Thanks for reporting" : "Couldn't send report",
    ok ? "Our team reviews reports within 24 hours and removes anything that breaks the community rules." : "Check your connection and try again.");
}

/** "Block this person?" → block, then the iOS alert. */
export async function blockFlow(userId, name) {
  const ok = await confirmDialog({ title: "Block this person?", message: "They won't be told. You can unblock them in Settings.", confirm: `Block ${name}`, destructive: true });
  if (!ok) return false;
  await blockUser(userId);
  showAlert(`${givenName(name)} is blocked`, "You won't see their posts, comments or messages, and they can't message you. Unblock in Settings.");
  return true;
}

/** iOS SafetyMenuButton items: "Report" and "Block {given}". */
export function safetyItems({ type, id, authorId, authorName }) {
  return [
    { label: "Report", icon: Flag, onClick: () => reportFlow(type, type === "user" ? authorId : id) },
    authorName && authorId ? { label: `Block ${givenName(authorName)}`, icon: Hand, danger: true, onClick: () => blockFlow(authorId, authorName) } : null,
  ];
}
