import type { ReportModel } from '../model/report-model';
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
 * Build the single, self-contained interactive `report.html`.
 *
 * Pure and synchronous: all image bytes are resolved beforehand by the platform
 * adapter and handed in via `images` (keyed by `ReportFigure.imageRef`). The
 * emitted document embeds the {@link ReportModel} plus the image map as a JSON
 * blob and drives everything (figure switcher, per-observation checklist, SVG
 * overlay, legend, deep-linking, copy-to-PNG) from that single source of truth.
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

  const imageMap: Record<string, ResolvedImage> = {};
  for (const figure of shownModel.figures) {
    const resolved = images.get(figure.imageRef);
    if (resolved) imageMap[figure.imageRef] = resolved;
  }

  const payload = serializeForScript({ model: shownModel, images: imageMap });
  const title = escapeHtml(model.survey.name ?? 'Survey report');

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
  <h1 id="survey-title"></h1>
  <p id="survey-meta"></p>
</header>
<main id="report-main">
  <nav id="figure-nav" aria-label="Figures"></nav>
  <section id="figure-panel">
    <div id="figure-toolbar">
      <h2 id="figure-title"></h2>
      <button id="copy-image" type="button">Copy image</button>
    </div>
    <div id="figure-stage">
      <img id="figure-image" alt="" />
      <svg id="figure-overlay" viewBox="0 0 1 1" preserveAspectRatio="none"></svg>
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
#figure-stage {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: #000;
  line-height: 0;
}
#figure-image { display: block; width: 100%; height: auto; }
#figure-overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
#figure-overlay polyline { fill: none; stroke-linejoin: round; stroke-linecap: round; }
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
.pin-swatch { display: inline-flex; align-items: center; justify-content: center; font-size: 10px; line-height: 1; border-radius: 50%; }
.check-label { flex: 1; font-size: 13px; }
.check-count { font-size: 11px; color: var(--muted); }
@media (max-width: 900px) {
  #report-main { grid-template-columns: 1fr; }
}
`;
