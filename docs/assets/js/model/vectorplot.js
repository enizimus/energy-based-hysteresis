/* Field plane: the pinning circles, the split of H into Hr and Hi per cell,
 * and the resulting magnetisation. H is draggable. */

import { prepare, drawArrow, dot, polyline, label } from './canvas.js';
import { palette, alpha } from './palette.js';
import { H_MAX, MS } from './engine.js';

const R = 2.35;          // world half-extent
const M_SCALE = 1.5;     // magnetisation drawn at this many field units per Ms
const TRAIL = 520;       // samples kept in the fading trail
const SUB = ['₁', '₂', '₃'];

export function createFieldPlot(canvas, tip, { onField }) {
  let geom = { w: 1, h: 1, s: 1 };
  const toWorld = (px, py) => ({ x: (px - geom.w / 2) / geom.s, y: (geom.h / 2 - py) / geom.s });
  let dragging = false;

  const emit = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const p = toWorld(ev.clientX - rect.left, ev.clientY - rect.top);
    onField(p.x, p.y);
  };

  canvas.addEventListener('pointerdown', (ev) => {
    dragging = true;
    emit(ev);
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* synthetic pointers */ }
    ev.preventDefault();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (dragging) emit(ev);
    if (tip) {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      const p = toWorld(x, y);
      tip.hidden = false;
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
      tip.textContent = `${dragging ? 'H = ' : ''}(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;
    }
  });
  const stop = (ev) => {
    dragging = false;
    if (tip && ev.pointerType !== 'mouse') tip.hidden = true;   // touch never fires pointerleave
    try {
      if (canvas.hasPointerCapture?.(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
    } catch { /* already released */ }
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('pointerleave', () => { if (tip) tip.hidden = true; });
  canvas.style.cursor = 'crosshair';

  return {
    render(d) {
      const p = palette();
      const { ctx, w, h } = prepare(canvas);
      const s = (Math.min(w, h) - 14) / (2 * R);
      geom = { w, h, s };
      const X = (wx) => w / 2 + wx * s;
      const Y = (wy) => h / 2 - wy * s;

      grid(ctx, w, h, X, Y, p);

      // saturation reach of M, at the scale M is drawn
      ctx.save();
      ctx.strokeStyle = alpha(p.cm, 0.28);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(X(0), Y(0), MS * M_SCALE * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      trails(ctx, d, X, Y, p);

      [...d.cells].sort((a, b) => b.kappa - a.kappa).forEach((c) => {
        const color = p.cells[c.index];
        const cx = X(c.hr.x), cy = Y(c.hr.y), rad = c.kappa * s;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fillStyle = alpha(color, 0.06);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (rad > 17) {
          label(ctx, cx - rad * 0.72 - 2, cy + rad * 0.72 + 4, `κ${SUB[c.index]}`,
            { color, size: 10.5, weight: 600, align: 'right' });
        }
      });

      drawArrow(ctx, X(0), Y(0), X(d.H.x), Y(d.H.y), { color: p.ink, width: 2.6, head: 10 });

      d.cells.forEach((c) => {
        const color = p.cells[c.index];
        drawArrow(ctx, X(0), Y(0), X(c.hr.x), Y(c.hr.y), { color, width: 2, head: 8 });
        drawArrow(ctx, X(c.hr.x), Y(c.hr.y), X(d.H.x), Y(d.H.y),
          { color, width: 1.5, head: 7, dash: [4, 3], alpha: 0.95 });
        dot(ctx, X(c.hr.x), Y(c.hr.y), 3.5, color, p.surface);
      });

      if (d.Mmag > 1e-4) {
        drawArrow(ctx, X(0), Y(0), X(d.M.x * M_SCALE), Y(d.M.y * M_SCALE), { color: p.cm, width: 2.6, head: 10 });
        label(ctx, X(d.M.x * M_SCALE) + 8, Y(d.M.y * M_SCALE) - 6, 'M', { color: p.cm, size: 12, weight: 600 });
      }

      dot(ctx, X(d.H.x), Y(d.H.y), 6, p.ink, p.surface);
      if (d.Hmag > 0.06) {
        label(ctx, X(d.H.x) + 10, Y(d.H.y) + 14, 'H', { color: p.ink, size: 12, weight: 600 });
      }
    },
  };
}

function grid(ctx, w, h, X, Y, p) {
  ctx.save();
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let u = -2; u <= 2.001; u += 0.5) {
    if (Math.abs(u) < 1e-9) continue;
    ctx.beginPath(); ctx.moveTo(X(u), Y(-R)); ctx.lineTo(X(u), Y(R)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(-R), Y(u)); ctx.lineTo(X(R), Y(u)); ctx.stroke();
  }
  ctx.strokeStyle = p.axis;
  ctx.beginPath(); ctx.moveTo(X(-R), Y(0)); ctx.lineTo(X(R), Y(0)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X(0), Y(-R)); ctx.lineTo(X(0), Y(R)); ctx.stroke();
  ctx.restore();

  for (const u of [-2, -1, 1, 2]) {
    label(ctx, X(u), Y(0) + 13, String(u), { color: p.muted, size: 10, align: 'center' });
    label(ctx, X(0) - 6, Y(u) + 3, String(u), { color: p.muted, size: 10, align: 'right' });
  }
  label(ctx, w - 6, Y(0) - 7, 'Hx', { color: p.muted, size: 10, align: 'right' });
  label(ctx, X(0) + 7, 12, 'Hy', { color: p.muted, size: 10 });
}

function trails(ctx, d, X, Y, p) {
  const n = d.samples.length;
  if (n < 2) return;
  const from = Math.max(0, n - TRAIL);
  const hPts = [], cellPts = [[], [], []];
  for (let i = from; i < n; i++) {
    const smp = d.samples[i];
    hPts.push([X(smp.h.x), Y(smp.h.y)]);
    for (let k = 0; k < 3; k++) cellPts[k].push([X(smp.hr[k].x), Y(smp.hr[k].y)]);
  }
  polyline(ctx, hPts, { color: p.muted, width: 1, alpha: 0.5 });
  cellPts.forEach((pts, k) => polyline(ctx, pts, { color: p.cells[k], width: 1.2, alpha: 0.4 }));
}

export { M_SCALE };
