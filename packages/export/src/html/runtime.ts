import { RUNTIME_IIFE } from './runtime-source.generated';

/**
 * Returns the browser runtime (as a string) embedded verbatim into `report.html`.
 * This returns a PRE-BAKED string constant, NOT `runtime.toString()`.
 * On Hermes (React Native) `Function.prototype.toString()` returns a
 * `function runtime() { [bytecode] }` stub, which would ship a broken runtime to
 * the report. The authored {@link runtime} function below is transpiled and
 * baked into `runtime-source.generated.ts` by a generator test; that committed
 * string is what Metro ships to the device and what we embed here.
 */
export function renderRuntime(): string {
  return RUNTIME_IIFE;
}

/**
 * Wraps the authored {@link runtime} function as a self-invoking source string.
 * Used ONLY in Node (the generator/drift test) — never on-device.
 */
export function renderRuntimeFromSource(): string {
  return `(${runtime.toString()})();`;
}

// The function below is never called in Node; it is transpiled, stringified and
// shipped to the browser (see the generator test). It intentionally uses only
// DOM globals available at runtime.
export function runtime(): void {
  interface Point { x: number; y: number; }
  interface FigurePath { observationId: string; color: string; label: string; points: Point[]; }
  interface FigurePin { locationId: string; label: string; x: number; y: number; surveyorNames: string[]; }
  interface Figure {
    figureId: string;
    kind: string;
    title: string;
    imageRef: string;
    locationId: string | null;
    paths: FigurePath[];
    pins: FigurePin[];
  }
  interface Observation { id: string; label: string; color: string; species: string | null; }
  interface Survey { name: string | null; postcode: string | null; date: string | null; status: string; }
  interface Model {
    survey: Survey;
    observations: Observation[];
    figures: Figure[];
  }
  interface ResolvedImage { dataUri: string; mediaPath: string; }

  const doc = document;
  const blob = doc.getElementById('report-data');
  if (!blob || !blob.textContent) return;
  const data = JSON.parse(blob.textContent) as { model: Model; images: Record<string, ResolvedImage>; };
  const model = data.model;
  const images = data.images;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const hidden = new Set<string>();
  const hiddenPins = new Set<string>();
  const PIN_COLOR = '#ff5252';
  let activeFigureId = model.figures.length ? model.figures[0].figureId : '';

  const $ = (id: string) => doc.getElementById(id)!;

  // ---- Header -----------------------------------------------------------
  $('survey-title').textContent = model.survey.name || 'Survey report';
  const metaBits: string[] = [];
  if (model.survey.postcode) metaBits.push(model.survey.postcode);
  if (model.survey.date) metaBits.push(new Date(model.survey.date).toLocaleDateString());
  metaBits.push(model.survey.status);
  $('survey-meta').textContent = metaBits.join(' \u2022 ');

  // ---- Figure navigation ------------------------------------------------
  const nav = $('figure-nav');
  model.figures.forEach((figure) => {
    const tab = doc.createElement('button');
    tab.type = 'button';
    tab.className = 'figure-tab';
    tab.textContent = figure.title;
    tab.setAttribute('data-figure', figure.figureId);
    tab.addEventListener('click', () => selectFigure(figure.figureId));
    nav.appendChild(tab);
  });

  function currentFigure(): Figure | undefined {
    return model.figures.filter((f) => f.figureId === activeFigureId)[0];
  }

  function selectFigure(figureId: string, highlightObs?: string): void {
    activeFigureId = figureId;
    const tabs = nav.querySelectorAll('.figure-tab');
    for (let i = 0; i < tabs.length; i++) {
      const el = tabs[i] as HTMLElement;
      el.setAttribute('aria-current', el.getAttribute('data-figure') === figureId ? 'true' : 'false');
    }
    renderFigure(highlightObs);
  }

  // ---- Figure rendering -------------------------------------------------
  function renderFigure(highlightObs?: string): void {
    const figure = currentFigure();
    const img = $('figure-image') as HTMLImageElement;
    const overlay = $('figure-overlay');
    $('figure-title').textContent = figure ? figure.title : '';
    while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
    if (!figure) { img.removeAttribute('src'); return; }

    const resolved = images[figure.imageRef];
    if (resolved) {
      img.src = resolved.dataUri;
      img.onerror = () => { img.onerror = null; img.src = resolved.mediaPath; };
      img.alt = figure.title;
    } else {
      img.onerror = null;
      img.removeAttribute('src');
      img.alt = '';
    }

    figure.paths.forEach((path) => {
      if (hidden.has(path.observationId)) return;
      const poly = doc.createElementNS(SVG_NS, 'polyline');
      poly.setAttribute('points', path.points.map((p) => p.x + ',' + p.y).join(' '));
      poly.setAttribute('stroke', path.color);
      poly.setAttribute('stroke-width', path.observationId === highlightObs ? '4' : '2.5');
      poly.setAttribute('vector-effect', 'non-scaling-stroke');
      overlay.appendChild(poly);
    });

    figure.pins.forEach((pin) => {
      if (hiddenPins.has(pin.locationId)) return;
      const marker = doc.createElementNS(SVG_NS, 'circle');
      marker.setAttribute('cx', String(pin.x));
      marker.setAttribute('cy', String(pin.y));
      marker.setAttribute('r', '0.012');
      marker.setAttribute('fill', PIN_COLOR);
      marker.setAttribute('stroke', '#ffffff');
      marker.setAttribute('stroke-width', '2');
      marker.setAttribute('vector-effect', 'non-scaling-stroke');
      const title = doc.createElementNS(SVG_NS, 'title');
      const who = pin.surveyorNames.length ? ' (' + pin.surveyorNames.join(', ') + ')' : '';
      title.textContent = pin.label + who;
      marker.appendChild(title);
      overlay.appendChild(marker);
    });

    renderChecklist(figure, highlightObs);
  }

  // ---- Per-observation checklist ---------------------------------------
  function renderChecklist(figure: Figure, highlightObs?: string): void {
    const list = $('checklist');
    while (list.firstChild) list.removeChild(list.firstChild);

    figure.pins.forEach((pin) => {
      const item = doc.createElement('li');
      item.className = 'check-item';

      const cb = doc.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !hiddenPins.has(pin.locationId);
      cb.setAttribute('aria-label', pin.label);
      cb.addEventListener('change', () => {
        if (cb.checked) hiddenPins.delete(pin.locationId); else hiddenPins.add(pin.locationId);
        renderFigure();
      });

      const swatch = doc.createElement('span');
      swatch.className = 'swatch pin-swatch';
      swatch.style.background = PIN_COLOR;
      swatch.textContent = '\uD83D\uDCCD';

      const text = doc.createElement('span');
      text.className = 'check-label';
      text.textContent = pin.surveyorNames.length
        ? pin.label + ' — ' + pin.surveyorNames.join(', ')
        : pin.label;

      item.appendChild(cb);
      item.appendChild(swatch);
      item.appendChild(text);
      list.appendChild(item);
    });

    const counts: Record<string, number> = {};
    const order: string[] = [];
    figure.paths.forEach((p) => {
      if (counts[p.observationId] === undefined) { counts[p.observationId] = 0; order.push(p.observationId); }
      counts[p.observationId]++;
    });

    if (!order.length && !figure.pins.length) {
      const empty = doc.createElement('li');
      empty.className = 'check-item empty';
      empty.textContent = 'No flight paths on this figure.';
      list.appendChild(empty);
      return;
    }

    order.forEach((obsId) => {
      const obs = model.observations.filter((o) => o.id === obsId)[0];
      const color = obs ? obs.color : '#888';
      const label = obs ? obs.label : obsId;

      const item = doc.createElement('li');
      item.className = 'check-item' + (obsId === highlightObs ? ' highlight' : '');

      const cb = doc.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !hidden.has(obsId);
      cb.addEventListener('change', () => {
        if (cb.checked) hidden.delete(obsId); else hidden.add(obsId);
        renderFigure();
      });

      const swatch = doc.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = color;

      const text = doc.createElement('span');
      text.className = 'check-label';
      text.textContent = label;

      const count = doc.createElement('span');
      count.className = 'check-count';
      count.textContent = String(counts[obsId]);

      item.appendChild(cb);
      item.appendChild(swatch);
      item.appendChild(text);
      item.appendChild(count);
      list.appendChild(item);
    });
  }

  $('select-all').addEventListener('click', () => { hidden.clear(); hiddenPins.clear(); renderFigure(); });
  $('select-none').addEventListener('click', () => {
    const figure = currentFigure();
    if (figure) {
      figure.paths.forEach((p) => hidden.add(p.observationId));
      figure.pins.forEach((p) => hiddenPins.add(p.locationId));
    }
    renderFigure();
  });

  // ---- Copy image (flatten base + overlay to a single PNG) --------------
  $('copy-image').addEventListener('click', () => { void copyImage(); });

  async function copyImage(): Promise<void> {
    const status = $('copy-status');
    const figure = currentFigure();
    const img = $('figure-image') as HTMLImageElement;
    if (!figure || !img.naturalWidth) { status.textContent = 'Nothing to copy yet.'; return; }

    const canvas = doc.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { status.textContent = 'Canvas unavailable.'; return; }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, canvas.width * 0.004);
    figure.paths.forEach((path) => {
      if (hidden.has(path.observationId) || !path.points.length) return;
      ctx.strokeStyle = path.color;
      ctx.beginPath();
      path.points.forEach((p, i) => {
        const x = p.x * canvas.width;
        const y = p.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    figure.pins.forEach((pin) => {
      if (hiddenPins.has(pin.locationId)) return;
      const x = pin.x * canvas.width;
      const y = pin.y * canvas.height;
      const r = Math.max(4, canvas.width * 0.012);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = PIN_COLOR;
      ctx.fill();
      ctx.lineWidth = Math.max(2, canvas.width * 0.003);
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    });

    try {
      const clip = (navigator as unknown as { clipboard?: { write?: (items: unknown[]) => Promise<void> } }).clipboard;
      const ClipboardItemCtor = (window as unknown as { ClipboardItem?: new (data: Record<string, Blob>) => unknown }).ClipboardItem;
      if (clip && clip.write && ClipboardItemCtor) {
        const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (pngBlob) {
          await clip.write([new ClipboardItemCtor({ 'image/png': pngBlob })]);
          status.textContent = 'Copied image to clipboard.';
          return;
        }
      }
      throw new Error('clipboard-unavailable');
    } catch {
      const link = doc.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = (figure.title || 'figure') + '.png';
      link.click();
      status.textContent = 'Clipboard blocked \u2014 downloaded PNG instead.';
    }
  }

  // ---- Deep-link landing (?fig=..&obs=..) ------------------------------
  function applyDeepLink(): void {
    const params = new URLSearchParams(window.location.search);
    const fig = params.get('fig');
    const obs = params.get('obs') || undefined;
    const target = fig && model.figures.filter((f) => f.figureId === fig)[0] ? fig : activeFigureId;
    selectFigure(target, obs);
  }

  applyDeepLink();
}
