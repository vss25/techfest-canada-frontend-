/* "Book a 30-minute call" (Nov 26 2026, the owner: "should go to this calendar link … preferably within the same
   website embedded"). Opens TTFC's Google Calendar appointment page in a panel over the page, so nobody leaves the
   site. Google's own booking page does the work (no data passes through this site); if it can't be shown in the
   panel, "Open in a new tab" is right there. Closes with ×, Escape or a click outside. */
export const CALL_URL = "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2Jq66lDapIA6ip3HMxo9eKv8ZWUCzpW4HaEaDQQsDt7cyJuIcZWG5CRk_KE_v_0CcKigx2ifUj";
const EMBED_URL = `${CALL_URL}?gv=true`;   // Google's embeddable view of the same page
const ID = "ttfc-book-call";

export function openCallBooking() {
  if (typeof document === "undefined" || document.getElementById(ID)) return;
  const last = document.activeElement;
  const wrap = document.createElement("div");
  wrap.id = ID;
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.setAttribute("aria-label", "Book a 30-minute call");
  wrap.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(9,0,39,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:Poppins,system-ui,sans-serif";
  wrap.innerHTML = `
    <div style="width:min(980px,100%);height:min(760px,calc(100dvh - 32px));display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:#FFFFFF;border:1px solid rgba(130,89,237,.55);box-shadow:0 30px 80px rgba(0,0,0,.5)">
      <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;color:#FFFFFF;background:radial-gradient(60% 160% at 0% 0%,rgba(84,24,168,.95),rgba(84,24,168,0) 62%),radial-gradient(60% 160% at 100% 100%,rgba(178,27,127,.95),rgba(178,27,127,0) 62%),#0A0028">
        <strong style="font-size:17px">Book a 30-minute call</strong>
        <a href="${CALL_URL}" target="_blank" rel="noopener noreferrer" style="margin-left:auto;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:underline;text-underline-offset:3px">Open in a new tab</a>
        <button type="button" data-close aria-label="Close" style="width:36px;height:36px;border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#FFFFFF;font-size:20px;line-height:1;cursor:pointer">×</button>
      </div>
      <iframe title="Book a 30-minute call with the TTFC partnerships team" src="${EMBED_URL}" style="flex:1;width:100%;border:0;background:#FFFFFF"></iframe>
    </div>`;
  const close = () => {
    document.removeEventListener("keydown", onKey);
    wrap.remove();
    document.documentElement.style.overflow = "";
    if (last && last.focus) last.focus();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  wrap.addEventListener("pointerdown", (e) => { if (e.target === wrap) close(); });
  wrap.querySelector("[data-close]").addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.documentElement.style.overflow = "hidden";
  document.body.appendChild(wrap);
  wrap.querySelector("[data-close]").focus();
}
