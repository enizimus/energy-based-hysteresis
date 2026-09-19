/* Tab routing plus the render loop that keeps every view of the model in step. */

import * as E from './model/engine.js';
import { invalidatePalette } from './model/palette.js';
import { createFriction } from './model/friction.js';
import { createWeiss } from './model/weiss.js';
import { createFieldPlot } from './model/vectorplot.js';
import { createLoopPlot } from './model/loop.js';
import { createReadout } from './model/readout.js';
import { createControls } from './model/controls.js';
import { renderEquations, renderAnhysteretic } from './model/equations.js';

/* ── tabs ────────────────────────────────────────────────────────────── */

const tabs = [...document.querySelectorAll('.tab')];
const VIEWS = tabs.map((t) => t.dataset.view);
let current = 'model';

function show(view, { push = true } = {}) {
  if (!VIEWS.includes(view)) view = 'model';
  current = view;
  tabs.forEach((tab) => {
    const on = tab.dataset.view === view;
    tab.setAttribute('aria-selected', String(on));
    document.getElementById(`view-${tab.dataset.view}`).hidden = !on;
  });
  if (push && location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  if (view === 'model') dirty = true;
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => show(tab.dataset.view));
  tab.addEventListener('keydown', (ev) => {
    const step = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    ev.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    next.focus();
    show(next.dataset.view);
  });
});
window.addEventListener('hashchange', () => show(location.hash.slice(1), { push: false }));

/* ── model panel ─────────────────────────────────────────────────────── */

const state = E.createState();
let dirty = true;
const mark = () => { dirty = true; };

const friction = createFriction(document.getElementById('friction-fig'), document.getElementById('friction-note'));
const weiss = createWeiss(document.getElementById('weiss-fig'));
const fieldPlot = createFieldPlot(document.getElementById('plot-field'), document.getElementById('tip-field'), {
  onField(x, y) { state.sweep = null; E.dragField(state, x, y); mark(); },
});
const loopPlot = createLoopPlot(document.getElementById('plot-loop'));
const readout = createReadout({
  chips: document.getElementById('eq-live'),
  rows: document.getElementById('state-rows'),
  foot: document.getElementById('state-foot'),
  legendField: document.getElementById('legend-field'),
  legendLoop: document.getElementById('legend-loop'),
});
const controls = createControls(document.getElementById('view-model'), state, mark);

renderEquations(document.getElementById('card-eq'));

const ro = new ResizeObserver(mark);
[document.getElementById('plot-field'), document.getElementById('plot-loop'),
  document.getElementById('friction-fig')].forEach((n) => ro.observe(n));
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => { invalidatePalette(); mark(); });
window.addEventListener('load', mark);   // KaTeX may land after the first paint

function render() {
  const d = E.derive(state);
  friction.render(d);
  weiss.render(d);
  fieldPlot.render(d);
  loopPlot.render(d);
  readout.render(d);
  renderAnhysteretic(d.anh.model);
  controls.sync();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.sweep) { E.stepSweep(state, dt); dirty = true; }
  if (dirty && current === 'model') { render(); dirty = false; }
  requestAnimationFrame(frame);
}

E.setDrive(state, 0.75, 0);   // a short virgin curve, so the panel opens with something to read
show(location.hash.slice(1) || 'model', { push: false });
requestAnimationFrame(frame);
