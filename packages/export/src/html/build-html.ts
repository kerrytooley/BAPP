import type { ReportFigure, ReportModel } from '../model/report-model';
import { renderRuntime } from './runtime';

/**
 * A base image resolved to bytes, ready to embed in the report.
 *
 * `dataUri` is inlined as the primary `<img src>` because a data URI keeps the
 * `<canvas>` un-tainted (so "copy image" can flatten it to a PNG). `mediaPath`
 * points at the same image copied loosely into the zip's `media/` folder and is
 * used only as an `onerror` fallback if a browser refuses the large data URI.
 */
export interface ResolvedImage {
  dataUri: string;
  mediaPath: string;
}

/**
 * Build the single, self-contained interactive report HTML.
 *
 * Pure and synchronous: all image bytes are resolved beforehand by the platform
 * adapter and handed in via `images` (keyed by `ReportFigure.imageRef`).
 *
 * The document is rendered twice over: a static version (header, every figure
 * with its image + overlay, and a legend) that works with JavaScript disabled —
 * phone file previewers such as iOS Quick Look never run scripts — and a hidden
 * interactive version that the runtime reveals when scripts do run. Base images
 * are inlined once, in the static `<img>`s; the runtime reuses those sources.
 */
export function buildReportHtml(
  model: ReportModel,
  images: Map<string, ResolvedImage>,
): string {
  // Equipment images ship in media/ but are not shown as figures in the report.
  const shownModel: ReportModel = {
    ...model,
    figures: model.figures.filter((figure) => figure.kind !== 'equipment'),
  };

  const mediaPaths: Record<string, { mediaPath: string }> = {};
  for (const figure of shownModel.figures) {
    const resolved = images.get(figure.imageRef);
    if (resolved) mediaPaths[figure.imageRef] = { mediaPath: resolved.mediaPath };
  }

  const payload = serializeForScript({ model: shownModel, images: mediaPaths });
  const title = escapeHtml(model.survey.name ?? 'Survey report');
  const meta = escapeHtml(surveyMeta(model));
  const staticFigures = shownModel.figures
    .map((figure) => renderStaticFigure(figure, shownModel, images.get(figure.imageRef)))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${STYLES}</style>
</head>
<body>
<header id="report-header">
  <h1 id="survey-title">${title}</h1>
  <p id="survey-meta">${meta}</p>
</header>
<div id="static-report">
  <p class="static-note">Showing every flight path. Open this file in a web browser to filter paths and copy images.</p>
${staticFigures || '  <p class="static-note">No figures in this report.</p>'}
</div>
<main id="report-main" hidden>
  <nav id="figure-nav" aria-label="Figures"></nav>
  <section id="figure-panel">
    <div id="figure-toolbar">
      <h2 id="figure-title"></h2>
      <button id="copy-image" type="button">Copy image</button>
    </div>
    <div id="figure-stage" class="figure-stage">
      <img id="figure-image" alt="" />
      <svg id="figure-overlay" class="figure-overlay" viewBox="0 0 1 1" preserveAspectRatio="none"></svg>
    </div>
    <p id="copy-status" role="status" aria-live="polite"></p>
  </section>
  <aside id="checklist-panel">
    <div id="checklist-header">
      <h2>Flight paths</h2>
      <div id="checklist-controls">
        <button id="select-all" type="button">All</button>
        <button id="select-none" type="button">None</button>
      </div>
    </div>
    <ul id="checklist"></ul>
  </aside>
</main>
<script id="report-data" type="application/json">${payload}</script>
<script>${renderRuntime()}</script>
</body>
</html>`;
}

const PIN_COLOR = '#ff5252';
// Keep in sync with PIN_SVG in runtime.ts (that copy ships inside the stringified runtime).
const PIN_SVG = `<svg viewBox="-1 -1 26 26" aria-hidden="true"><path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="${PIN_COLOR}" stroke="#ffffff" stroke-width="1.5"/><circle cx="12" cy="9" r="3.2" fill="#ffffff"/></svg>`;

function surveyMeta(model: ReportModel): string {
  const bits: string[] = [];
  if (model.survey.postcode) bits.push(model.survey.postcode);
  if (model.survey.date) {
    const d = model.survey.date;
    const pad = (n: number) => String(n).padStart(2, '0');
    bits.push(`${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`);
  }
  bits.push(model.survey.status);
  return bits.join(' \u2022 ');
}

/** One figure as plain HTML/SVG: base image, every path and pin, and a legend. */
function renderStaticFigure(
  figure: ReportFigure,
  model: ReportModel,
  image: ResolvedImage | undefined,
): string {
  const title = escapeHtml(figure.title);
  const img = image
    ? `<img data-figure-id="${escapeHtml(figure.figureId)}" src="${escapeHtml(image.dataUri)}" alt="${title}" />`
    : '';

  const polylines = figure.paths
    .map((path) => {
      const points = path.points.map((p) => `${p.x},${p.y}`).join(' ');
      return `<polyline points="${points}" stroke="${escapeHtml(path.color)}" stroke-width="2.5" vector-effect="non-scaling-stroke" />`;
    })
    .join('');
  const pins = figure.pins
    .map((pin) => {
      const who = pin.surveyorNames.length ? ` (${pin.surveyorNames.join(', ')})` : '';
      return `<span class="pin-marker" style="left:${pin.x * 100}%;top:${pin.y * 100}%" title="${escapeHtml(pin.label + who)}">${PIN_SVG}</span>`;
    })
    .join('');

  const pinItems = figure.pins.map((pin) => {
    const who = pin.surveyorNames.length ? ` \u2014 ${pin.surveyorNames.join(', ')}` : '';
    return `<li class="check-item"><span class="pin-swatch">${PIN_SVG}</span><span class="check-label">${escapeHtml(pin.label + who)}</span></li>`;
  });

  const counts = new Map<string, number>();
  for (const path of figure.paths) counts.set(path.observationId, (counts.get(path.observationId) ?? 0) + 1);
  const pathItems = [...counts].map(([obsId, count]) => {
    const obs = model.observations.find((o) => o.id === obsId);
    const color = escapeHtml(obs?.color ?? '#888');
    return `<li class="check-item"><span class="swatch" style="background:${color}"></span><span class="check-label">${escapeHtml(obs?.label ?? obsId)}</span><span class="check-count">${count}</span></li>`;
  });

  const items = [...pinItems, ...pathItems];
  const legend = items.length
    ? items.join('')
    : '<li class="check-item empty">No flight paths on this figure.</li>';

  return `  <section class="static-figure">
    <h2>${title}</h2>
    <div class="figure-stage">${img}<svg class="figure-overlay" viewBox="0 0 1 1" preserveAspectRatio="none">${polylines}</svg>${pins}</div>
    <ul class="legend">${legend}</ul>
  </section>`;
}

/** Serialize JSON safely for inlining inside a `<script>` element. */
function serializeForScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STYLES = `
:root {
  --bg: #0f1115;
  --panel: #171a21;
  --panel-2: #1f232c;
  --border: #2a2f3a;
  --text: #e7eaf0;
  --muted: #9aa4b2;
  --accent: #4f8cff;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
}
#report-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
#report-header h1 { margin: 0 0 4px; font-size: 20px; }
#report-header p { margin: 0; color: var(--muted); font-size: 13px; }
#report-main {
  display: grid;
  grid-template-columns: 200px 1fr 300px;
  gap: 16px;
  padding: 16px 20px;
  align-items: start;
}
#figure-nav { display: flex; flex-direction: column; gap: 6px; }
.figure-tab {
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
}
.figure-tab[aria-current="true"] { border-color: var(--accent); background: var(--panel-2); }
#figure-panel { min-width: 0; }
#figure-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
#figure-toolbar h2 { margin: 0; font-size: 16px; }
.figure-stage {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: #000;
  line-height: 0;
}
.figure-stage img { display: block; width: 100%; height: auto; }
.figure-overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
.figure-overlay polyline { fill: none; stroke-linejoin: round; stroke-linecap: round; }
#static-report { padding: 16px 20px; display: flex; flex-direction: column; gap: 24px; max-width: 900px; }
.static-note { margin: 0; color: var(--muted); font-size: 13px; }
.static-figure h2 { margin: 0 0 10px; font-size: 16px; }
.legend { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
button {
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--text);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
}
button:hover { border-color: var(--accent); }
#copy-status { min-height: 18px; margin: 8px 2px 0; font-size: 12px; color: var(--muted); }
#checklist-panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
#checklist-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
#checklist-header h2 { margin: 0; font-size: 15px; }
#checklist-controls { display: flex; gap: 6px; }
#checklist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.check-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; cursor: pointer; }
.check-item:hover { background: var(--panel-2); }
.check-item.highlight { outline: 1px solid var(--accent); }
.check-item.empty { color: var(--muted); cursor: default; }
.swatch { width: 14px; height: 14px; border-radius: 3px; flex: none; }
.pin-swatch { width: 16px; height: 16px; flex: none; line-height: 0; }
.pin-swatch svg { width: 100%; height: 100%; }
.pin-marker { position: absolute; width: 28px; height: 28px; transform: translate(-50%, -100%); line-height: 0; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6)); }
.pin-marker svg { width: 100%; height: 100%; }
.check-label { flex: 1; font-size: 13px; }
.check-count { font-size: 11px; color: var(--muted); }
@media (max-width: 900px) {
  #report-main { grid-template-columns: 1fr; }
}
`;
