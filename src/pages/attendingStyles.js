/* The /attending page's look (a dark aurora page, glass cards, the brand gradient button), shared with the other
   page the app opens on the website: /share/linkedin (Oct 22 2026). Plain CSS in a string, injected
   by each page with <style>, so none of it reaches the rest of the site. */

export const ATT_CSS = `
body.att-open { background: #06020f !important; padding-bottom: 0 !important; }
.att-root {
  position: relative; min-height: 100vh; min-height: 100dvh; color: #fff; overflow-x: hidden;
  font-family: 'DM Sans', system-ui, Helvetica, Arial, sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 26px 16px 32px; box-sizing: border-box;
}
.att-root *, .att-root *::before, .att-root *::after { box-sizing: border-box; }
.att-brand { position: relative; z-index: 1; margin-bottom: 6px; }
.att-brand img { height: 128px; max-width: 70vw; width: auto; display: block; }

.att-hero { position: relative; z-index: 1; text-align: center; max-width: 720px; margin: 0 auto 26px; }
.att-eyebrow { font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 1.8px; text-transform: uppercase; color: #ffc56b; margin: 0 0 12px; }
.att-title { font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: clamp(1.6rem, 5.6vw, 2.6rem); line-height: 1.12; letter-spacing: -0.3px; margin: 0;
  background: linear-gradient(100deg, #fff 30%, #f6d0ff 70%, #ffd9a0); -webkit-background-clip: text; background-clip: text; color: transparent; }
.att-sub { margin: 14px auto 0; color: rgba(255,255,255,0.84); font-size: 16px; line-height: 1.6; max-width: 560px; }

.att-grid { position: relative; z-index: 1; width: 100%; max-width: 1120px; display: grid; gap: 18px; grid-template-columns: 1fr; align-items: start; }
@media (min-width: 960px) {
  .att-grid { grid-template-columns: minmax(0, 1.06fr) minmax(0, 1fr); gap: 24px; }
  .att-preview-col { position: sticky; top: 20px; }
}

.att-card {
  position: relative; width: 100%; border-radius: 28px; padding: 22px;
  background: linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.04) 100%), rgba(10,4,24,0.55);
  -webkit-backdrop-filter: blur(24px) saturate(130%); backdrop-filter: blur(24px) saturate(130%);
  border: 1px solid rgba(255,255,255,0.13);
  box-shadow: 0 30px 90px rgba(3,0,12,0.55), inset 0 1px 0 rgba(255,255,255,0.14);
}
.att-card::before {
  content: ""; position: absolute; inset: -1px; border-radius: inherit; padding: 1px; pointer-events: none;
  background: linear-gradient(130deg, #7a3fd1, #e8458b 45%, #f5a623 90%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; opacity: .35; transition: opacity .35s ease;
}
.att-card:hover::before, .att-card:focus-within::before { opacity: .8; }

.att-preview-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.att-seg { display: inline-flex; padding: 4px; border-radius: 99px; background: rgba(6,2,15,0.5); border: 1px solid rgba(255,255,255,0.12); }
.att-seg-btn { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: 99px; border: 0; cursor: pointer;
  font: inherit; font-size: 13.5px; font-weight: 700; color: rgba(255,255,255,0.75); background: transparent; transition: background .2s, color .2s, box-shadow .2s; }
.att-seg-btn:hover { color: #fff; }
.att-seg-btn[data-on] { color: #fff; background: linear-gradient(120deg, rgba(122,63,209,0.75), rgba(232,69,139,0.6)); box-shadow: 0 6px 20px rgba(232,69,139,0.3); }
.att-seg-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.att-shape { display: inline-block; border: 1.5px solid currentColor; border-radius: 3px; opacity: .9; }
.att-shape-square { width: 12px; height: 12px; }
.att-shape-landscape { width: 16px; height: 9px; }
.att-dims { font-family: 'Orbitron', sans-serif; font-size: 10.5px; letter-spacing: 1.2px; color: rgba(255,255,255,0.6); font-variant-numeric: tabular-nums; }

.att-canvas-wrap { position: relative; width: 100%; border-radius: 18px; overflow: hidden; background: #06020f;
  box-shadow: 0 24px 60px rgba(3,0,12,0.6), 0 0 0 1px rgba(255,255,255,0.08); }
.att-canvas { display: block; width: 100%; height: 100%; outline: none; }
.att-canvas[data-photo] { cursor: grab; touch-action: none; }
.att-canvas[data-photo]:active { cursor: grabbing; }
.att-canvas:focus-visible { box-shadow: inset 0 0 0 3px #e8458b; }
.att-canvas-busy { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  background: rgba(6,2,15,0.55); color: rgba(255,255,255,0.85); font-size: 14px; }

.att-frame { margin-top: 14px; }
.att-zoom { display: flex; align-items: center; gap: 8px; }
.att-icon-btn { flex: none; width: 38px; height: 38px; border-radius: 99px; display: grid; place-items: center; cursor: pointer; color: #fff;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16); transition: border-color .2s, background .2s; }
.att-icon-btn:hover { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.1); }
.att-icon-btn:focus-visible { outline: 2px solid #e8458b; outline-offset: 2px; }
.att-range { flex: 1; min-width: 0; height: 38px; background: transparent; -webkit-appearance: none; appearance: none; cursor: pointer; }
.att-range::-webkit-slider-runnable-track { height: 6px; border-radius: 99px; background: linear-gradient(90deg, #7a3fd1, #e8458b var(--fill), rgba(255,255,255,0.14) var(--fill)); }
.att-range::-moz-range-track { height: 6px; border-radius: 99px; background: rgba(255,255,255,0.14); }
.att-range::-moz-range-progress { height: 6px; border-radius: 99px; background: linear-gradient(90deg, #7a3fd1, #e8458b); }
.att-range::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; margin-top: -8px; border-radius: 99px; background: #fff; border: 0; box-shadow: 0 0 0 4px rgba(232,69,139,0.45), 0 4px 14px rgba(0,0,0,0.4); }
.att-range::-moz-range-thumb { width: 22px; height: 22px; border-radius: 99px; background: #fff; border: 0; box-shadow: 0 0 0 4px rgba(232,69,139,0.45), 0 4px 14px rgba(0,0,0,0.4); }
.att-range:focus-visible { outline: none; }
.att-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 5px #e8458b; }
.att-hint { display: flex; align-items: center; gap: 7px; margin: 10px 0 0; font-size: 13px; color: rgba(255,255,255,0.76); line-height: 1.5; }
.att-hint-center { justify-content: center; margin-top: 14px; }
.att-hint > svg { flex: none; }

.att-controls { padding: 24px 24px 22px; }
.att-step + .att-step { margin-top: 24px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,0.08); }
.att-step-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.att-step-n { flex: none; width: 30px; height: 30px; border-radius: 99px; display: grid; place-items: center; font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 800;
  background: linear-gradient(135deg, #7a3fd1, #e8458b); box-shadow: 0 0 16px rgba(232,69,139,0.45); }
.att-step-title { font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: 0.6px; margin: 0; flex: 1; }
.att-step-aside { margin: 0 !important; }

.att-photo-actions { display: grid; grid-template-columns: 1fr; gap: 10px; }
@media (min-width: 520px) { .att-photo-actions { grid-template-columns: 1fr 1fr; } .att-photo-actions[data-count="3"] .att-btn-li { grid-column: 1 / -1; } }
.att-btn-li, .att-btn-soft { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 50px; padding: 0 18px; border-radius: 16px;
  font: inherit; font-size: 15px; font-weight: 700; color: #fff; text-decoration: none; cursor: pointer; transition: transform .15s, box-shadow .25s, border-color .2s, background .2s; }
.att-btn-li { background: linear-gradient(120deg, #0a66c2, #2b7fd6); box-shadow: 0 10px 28px rgba(10,102,194,0.35), inset 0 1px 0 rgba(255,255,255,0.25); }
.att-btn-li:hover { box-shadow: 0 12px 34px rgba(10,102,194,0.5), inset 0 1px 0 rgba(255,255,255,0.25); }
.att-btn-soft { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16); }
.att-btn-soft:hover { border-color: rgba(255,255,255,0.36); background: rgba(255,255,255,0.1); box-shadow: 0 0 22px rgba(122,63,209,0.28); }
.att-btn-soft:focus-within, .att-btn-li:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.att-btn-li:active, .att-btn-soft:active { transform: scale(0.985); }
.att-file { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; clip: rect(0 0 0 0); }
.att-photo-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 14px; margin-top: 12px; }
.att-private { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 12.5px; color: rgba(255,255,255,0.72); }

.att-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.att-field { margin-bottom: 12px; }
.att-field:last-child { margin-bottom: 0; }
.att-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 7px; color: rgba(255,255,255,0.9); }
.att-optional { color: rgba(255,255,255,0.62); font-weight: 500; }
.att-input { width: 100%; height: 50px; border-radius: 14px; padding: 0 15px; font: inherit; font-size: 16px; color: #fff;
  background: rgba(6,2,15,0.5); border: 1px solid rgba(255,255,255,0.15); outline: none; transition: border-color .2s, box-shadow .2s, background .2s; }
.att-input::placeholder { color: rgba(255,255,255,0.3); }
.att-input:hover { border-color: rgba(255,255,255,0.28); }
.att-input:focus { border-color: #e8458b; box-shadow: 0 0 0 4px rgba(232,69,139,0.2), 0 0 24px rgba(232,69,139,0.18); background: rgba(6,2,15,0.65); }
.att-textarea { height: auto; min-height: 160px; overflow-y: auto; padding: 13px 15px; resize: vertical; line-height: 1.55; font-size: 15px; }
.att-count { margin: 6px 2px 0; text-align: right; font-size: 12px; color: rgba(255,255,255,0.6); font-variant-numeric: tabular-nums; }

.att-actions { margin-top: 22px; }
.att-btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 10px; height: 58px; padding: 0 22px; border-radius: 99px; border: 0; cursor: pointer;
  font: inherit; font-size: 17px; font-weight: 700; color: #fff; letter-spacing: 0.2px;
  background: linear-gradient(90deg, #7a3fd1, #e8458b, #f5a623, #e8458b, #7a3fd1); background-size: 300% 100%; background-position: 0% 0;
  box-shadow: 0 12px 34px rgba(232,69,139,0.38), inset 0 1px 0 rgba(255,255,255,0.3); transition: background-position .6s ease, transform .15s ease, box-shadow .25s; }
.att-btn:hover:not(:disabled) { background-position: 60% 0; box-shadow: 0 14px 44px rgba(232,69,139,0.5), inset 0 1px 0 rgba(255,255,255,0.3); }
.att-btn:active:not(:disabled) { transform: scale(0.985); }
.att-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.att-btn:disabled { cursor: progress; opacity: 0.7; }
.att-actions-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.att-btn-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; padding: 0 14px; border-radius: 99px; cursor: pointer;
  font: inherit; font-size: 14.5px; font-weight: 700; color: #fff; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); transition: border-color .2s, background .2s, color .2s; }
.att-btn-ghost:hover:not(:disabled) { border-color: rgba(255,255,255,0.42); background: rgba(255,255,255,0.1); }
.att-btn-ghost:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.att-btn-ghost:disabled { opacity: .6; cursor: progress; }
.att-btn-ghost[data-done] { border-color: rgba(120,230,170,0.6); color: #b9f5d2; background: rgba(60,200,130,0.12); }

.att-text-btn { display: inline-flex; align-items: center; gap: 6px; margin-top: 2px; background: none; border: 0; padding: 4px 0; color: #ffb3d1; font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; text-decoration: none; }
.att-text-btn:hover { color: #fff; }
.att-text-btn:focus-visible { outline: 2px solid #e8458b; outline-offset: 3px; border-radius: 6px; }
.att-error { display: flex; gap: 7px; align-items: flex-start; margin: 12px 0 0; padding: 11px 13px; border-radius: 14px; font-size: 13.5px; line-height: 1.5; color: #ffc2cb;
  background: rgba(255,90,110,0.1); border: 1px solid rgba(255,120,140,0.3); }
.att-error svg { flex: none; margin-top: 2px; }
.att-posted { position: relative; z-index: 1; display: flex; gap: 14px; align-items: flex-start; width: 100%; max-width: 720px; margin: 0 auto 22px; padding: 18px 20px; border-radius: 20px;
  background: rgba(60,200,130,0.14); border: 1px solid rgba(120,230,170,0.45); box-shadow: 0 18px 50px rgba(0,0,0,0.35); }
.att-posted-icon { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: rgba(120,230,170,0.22); color: #c9f7dc; }
.att-posted-title { font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 17px; margin: 2px 0 6px; color: #e9fff2; }
.att-posted-sub { margin: 0 0 8px; font-size: 14.5px; line-height: 1.55; color: rgba(233,255,242,0.86); }
.att-post-error > div { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.att-back-app { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; margin-top: 8px; padding: 0 18px; border-radius: 99px;
  font-weight: 700; font-size: 14.5px; color: #06020f; background: #c9f7dc; text-decoration: none; }
.att-back-app:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.att-points-note { color: rgba(255,255,255,0.86); text-align: center; }
.att-points-note b { color: #ffd9a0; }
.att-share-instead { display: flex; margin: 10px auto 0; }
.att-done { display: flex; align-items: center; gap: 8px; margin: 16px 0 0; padding: 12px 14px; border-radius: 14px; font-size: 14px; color: #c9f7dc; background: rgba(60,200,130,0.12); border: 1px solid rgba(120,230,170,0.35); }

.att-guide { margin-top: 18px; padding: 16px 16px 12px; border-radius: 18px; background: linear-gradient(120deg, rgba(122,63,209,0.26), rgba(232,69,139,0.18)); border: 1px solid rgba(255,255,255,0.18); }
.att-guide-title { margin: 0 0 12px; font-weight: 700; font-size: 15px; color: #ffd9a0; }
.att-guide-steps { list-style: none; margin: 0 0 8px; padding: 0; display: grid; gap: 10px; }
.att-guide-steps li { display: flex; gap: 11px; align-items: flex-start; font-size: 13.5px; line-height: 1.5; color: rgba(255,255,255,0.88); }
.att-guide-steps b { color: #fff; }
.att-guide-n { flex: none; width: 24px; height: 24px; border-radius: 99px; display: grid; place-items: center; font-size: 12px; font-weight: 800; margin-top: 1px;
  border: 1.5px solid rgba(255,255,255,0.4); }
.att-guide-steps li[data-done] .att-guide-n { border-color: transparent; background: linear-gradient(135deg, #7a3fd1, #e8458b); box-shadow: 0 0 12px rgba(232,69,139,0.5); }
.att-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; overflow-wrap: anywhere; }

.att-foot { position: relative; z-index: 1; margin: 24px 0 0; padding: 0; background: none; border: 0; font-size: 13px; color: rgba(255,255,255,0.72); text-align: center; line-height: 1.7; }
.att-foot p { margin: 0; }
.att-link { color: #ffb3d1; text-decoration: underline; text-underline-offset: 2px; }
.att-link:hover { color: #fff; }
.att-sr { position: absolute !important; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); border: 0; white-space: nowrap; }
.att-spin { animation: attSpin 0.9s linear infinite; }
@keyframes attSpin { to { transform: rotate(360deg); } }

@media (max-width: 480px) {
  .att-root { padding: 16px 16px 28px; }
  .att-brand img { height: 96px; }
  .att-hero { margin-bottom: 18px; }
  .att-sub { font-size: 15px; }
  .att-card { border-radius: 24px; padding: 16px; }
  .att-controls { padding: 20px 16px 18px; }
  .att-canvas-wrap { border-radius: 14px; }
  .att-dims { display: none; }
  .att-seg { width: 100%; }
  .att-seg-btn { flex: 1; justify-content: center; }
  .att-grid2 { gap: 10px; }
  .att-grid2 .att-field:last-child { margin-bottom: 12px; }
  .att-btn-ghost { font-size: 13.5px; padding: 0 8px; gap: 6px; white-space: nowrap; }
}
@media (prefers-reduced-motion: reduce) {
  .att-spin { animation-duration: 2s; }
  .att-btn, .att-btn-li, .att-btn-soft { transition: none; }
}
`;
