export const css = /* css */ `
:host {
  --sc-primary: #ec0000;
  --sc-bg: #ffffff;
  --sc-header-bg: var(--sc-primary);
  --sc-header-fg: #ffffff;
  --sc-font: inherit;

  --sc-ink: #14161a;
  --sc-ink-2: #4b5563;
  --sc-ink-3: #6b7685;
  --sc-line: #e7e8ec;
  --sc-soft: #f6f7f9;
  --sc-tint: color-mix(in srgb, var(--sc-primary) 7%, var(--sc-bg));
  --sc-radius: 18px;

  display: inline-block;
  font-family: var(--sc-font);
  color: var(--sc-ink);
  -webkit-font-smoothing: antialiased;
}
:host([hidden]) { display: none; }
:host([data-block]) { display: block; }
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
button { font: inherit; }

/* ── Trigger ─────────────────────────────────────────────────────────── */
.trigger {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; min-height: 48px; padding: 12px 22px;
  border: 0; border-radius: 10px;
  background: var(--sc-primary); color: #fff;
  font-size: 16px; font-weight: 600; line-height: 1.2; letter-spacing: .005em;
  cursor: pointer;
  transition: filter .15s ease, transform .15s ease, box-shadow .15s ease;
  box-shadow: 0 1px 2px rgb(0 0 0 / .12);
}
.trigger:hover { filter: brightness(.94); }
.trigger:active { transform: translateY(1px); }
.trigger:focus-visible { outline: 3px solid color-mix(in srgb, var(--sc-primary) 35%, transparent); outline-offset: 2px; }
.trigger svg { flex: none; width: 18px; height: 18px; }

/* ── Overlay / dialog ────────────────────────────────────────────────── */
.overlay {
  position: fixed; inset: 0; z-index: 2147483000;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  background: rgb(10 12 20 / .55);
  backdrop-filter: blur(3px);
  animation: sc-fade .2s ease both;
}
.overlay.is-closing { animation: sc-fade .16s ease reverse both; }
.overlay.is-closing .panel { animation: sc-rise .16s ease reverse both; }

.panel {
  position: relative;
  display: flex; flex-direction: column;
  width: min(600px, 100%);
  max-height: min(92vh, 900px);
  background: var(--sc-bg);
  border-radius: var(--sc-radius);
  overflow: hidden;
  box-shadow: 0 2px 6px rgb(0 0 0 / .06), 0 24px 64px rgb(0 0 0 / .22);
  animation: sc-rise .32s cubic-bezier(.16, 1, .3, 1) both;
  font-size: 15px; line-height: 1.45;
}
.panel:focus { outline: none; }

@keyframes sc-fade { from { opacity: 0; } }
@keyframes sc-rise { from { opacity: 0; transform: translateY(24px) scale(.98); } }
@keyframes sc-sheet { from { transform: translateY(100%); } }

/* ── Mandatory warning (black, as approved) ──────────────────────────── */
.warning {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 9px 20px;
  background: #000; color: #fff;
  font-size: 15px; font-weight: 600; text-align: center; line-height: 1.35;
}
.warning svg { flex: none; width: 17px; height: 17px; }

/* ── Header ──────────────────────────────────────────────────────────── */
.head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 16px 20px 16px 24px;
  background: var(--sc-header-bg); color: var(--sc-header-fg);
}
.title { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -.01em; color: inherit; }
.close {
  display: grid; place-items: center; flex: none;
  width: 34px; height: 34px; padding: 0;
  border: 0; border-radius: 50%;
  background: color-mix(in srgb, currentColor 16%, transparent); color: inherit;
  cursor: pointer; transition: background .15s;
}
.close:hover { background: color-mix(in srgb, currentColor 28%, transparent); }
.close:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.close svg { width: 16px; height: 16px; }

/* ── Body ────────────────────────────────────────────────────────────── */
.body {
  display: grid; gap: 18px;
  padding: 22px 24px 24px;
  overflow-y: auto; overscroll-behavior: contain;
  scrollbar-width: thin; scrollbar-color: var(--sc-line) transparent;
}
.label {
  display: block; margin: 0 0 8px;
  font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
  color: var(--sc-ink-3);
}

.amount {
  display: flex; align-items: center;
  border: 1.5px solid var(--sc-line); border-radius: 12px;
  background: var(--sc-soft);
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.amount:focus-within {
  border-color: var(--sc-primary); background: var(--sc-bg);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--sc-primary) 12%, transparent);
}
.amount input {
  flex: 1; min-width: 0;
  padding: 12px 16px; border: 0; outline: 0; background: transparent;
  font: inherit; font-size: 24px; font-weight: 700; letter-spacing: -.02em; color: var(--sc-ink);
  font-variant-numeric: tabular-nums;
}
.amount .cur { padding: 0 18px 0 4px; font-size: 20px; font-weight: 600; color: var(--sc-ink-3); }

.segmented {
  display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px;
  padding: 4px; border-radius: 12px; background: var(--sc-soft); border: 1px solid var(--sc-line);
}
.seg {
  padding: 9px 10px; border: 0; border-radius: 9px;
  background: transparent; color: var(--sc-ink-2);
  font-size: 14px; font-weight: 600; white-space: nowrap; cursor: pointer;
  transition: background .15s, color .15s, box-shadow .15s;
}
.seg:hover:not([aria-checked="true"]):not(:disabled) { background: var(--sc-bg); color: var(--sc-ink); }
.seg[aria-checked="true"] { background: var(--sc-primary); color: #fff; box-shadow: 0 1px 4px rgb(0 0 0 / .16); }
.seg:disabled { opacity: .4; cursor: not-allowed; }
.seg:focus-visible { outline: 2px solid var(--sc-primary); outline-offset: 1px; }

.notice {
  margin: 8px 0 0; padding: 7px 12px; border-radius: 8px;
  background: var(--sc-tint); color: var(--sc-primary);
  font-size: 13px; font-weight: 600;
  animation: sc-rise .22s cubic-bezier(.16, 1, .3, 1) both;
}

/* ── Result ──────────────────────────────────────────────────────────── */
.result { display: grid; gap: 14px; }
.teaser { margin: 0; color: var(--sc-ink-2); font-size: 15px; font-weight: 500; }
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat {
  display: grid; gap: 6px; padding: 14px 16px;
  border-radius: 14px; border: 1px solid var(--sc-line); background: var(--sc-bg);
}
.stat--primary { background: var(--sc-tint); border-color: color-mix(in srgb, var(--sc-primary) 22%, transparent); }
.stat-label { font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--sc-ink-3); }
.stat-value { font-size: 26px; font-weight: 750; letter-spacing: -.025em; line-height: 1.1; font-variant-numeric: tabular-nums; }
.stat--primary .stat-value { color: var(--sc-primary); }

.chart { display: block; width: 100%; height: 56px; }
.chart rect { fill: color-mix(in srgb, var(--sc-primary) 22%, var(--sc-bg)); }
.chart rect:first-child { fill: var(--sc-primary); }

.table-wrap {
  max-height: 300px; overflow-y: auto;
  border: 1px solid var(--sc-line); border-radius: 14px;
  scrollbar-width: thin; scrollbar-color: var(--sc-line) transparent;
}
:host([mode="inline"]) .table-wrap { max-height: 420px; }
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
th {
  position: sticky; top: 0; z-index: 1;
  padding: 10px 18px; background: var(--sc-soft); border-bottom: 1px solid var(--sc-line);
  font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--sc-ink-3);
  text-align: left;
}
th:last-child, td:last-child { text-align: right; }
td { padding: 9px 18px; border-bottom: 1px solid var(--sc-line); font-size: 15px; color: var(--sc-ink-2); }
td:first-child { width: 72px; color: var(--sc-ink-3); font-size: 14px; }
td:last-child { color: var(--sc-ink); font-weight: 600; }
tr:last-child td { border-bottom: 0; }
tbody tr:first-child td { background: var(--sc-tint); }
tbody tr:first-child td:last-child { color: var(--sc-primary); font-weight: 750; }
tbody tr:hover td { background: var(--sc-soft); }

.message {
  margin: 0; padding: 18px; border-radius: 14px; text-align: center;
  background: var(--sc-soft); color: var(--sc-ink-2); font-weight: 500;
}

.fineprint { margin: -8px 0 0; font-size: 12px; color: var(--sc-ink-3); }
.meta { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.legal {
  padding: 14px 16px; border-radius: 12px;
  background: var(--sc-soft); border: 1px solid var(--sc-line);
  font-size: 12.5px; line-height: 1.65; color: var(--sc-ink-3);
}
.legal strong { color: var(--sc-ink-2); font-weight: 700; }
.legal p { margin: 0; }

/* ── Inline mode ─────────────────────────────────────────────────────── */
:host([mode="inline"]) { display: block; }
:host([mode="inline"]) .panel {
  width: 100%; max-height: none; animation: none;
  box-shadow: none; border: 1px solid var(--sc-line);
}
:host([mode="inline"]) .body { overflow: visible; }
:host([mode="inline"]) .close { display: none; }

/* ── Phones: bottom sheet ────────────────────────────────────────────── */
@media (max-width: 560px) {
  .overlay { align-items: flex-end; padding: 0; }
  .overlay .panel {
    width: 100%; max-height: 94dvh;
    border-radius: 20px 20px 0 0;
    animation: sc-sheet .34s cubic-bezier(.16, 1, .3, 1) both;
  }
  .overlay.is-closing .panel { animation: sc-sheet .2s ease reverse both; }
  .warning { font-size: 13.5px; padding: 8px 16px; }
  .head { padding: 14px 16px 14px 20px; }
  .body { padding: 18px 16px 22px; gap: 16px; }
  .amount input { font-size: 22px; }
  .stat-value { font-size: 22px; }
  .seg { font-size: 13px; padding: 9px 6px; }
  td, th { padding-left: 14px; padding-right: 14px; }
  :host([mode="inline"]) .panel { border-radius: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;
