/* Projected hysteresis loop: M·ê against H·ê, traced from the stored path,
 * with the single-valued anhysteretic curve for reference. */

import { prepare, polyline, dot, label } from './canvas.js';
import { palette, alpha } from './palette.js';
import { H_MAX, anhystScalar } from './engine.js';

const PAD = { l: 40, r: 14, t: 14, b: 26 };
const YMAX = 1.3;

export function createLoopPlot(canvas) {
  return {
    render(d) {
      const p = palette();
      const { ctx, w, h } = prepare(canvas);
      const X = (v) => PAD.l + ((v + H_MAX) / (2 * H_MAX)) * (w - PAD.l - PAD.r);
      const Y = (v) => PAD.t + ((YMAX - v) / (2 * YMAX)) * (h - PAD.t - PAD.b);

      // grid
      ctx.save();
      ctx.strokeStyle = p.grid;
      ctx.lineWidth = 1;
      for (let v = -2; v <= 2.001; v += 0.5) {
        if (Math.abs(v) < 1e-9) continue;
        ctx.beginPath(); ctx.moveTo(X(v), Y(YMAX)); ctx.lineTo(X(v), Y(-YMAX)); ctx.stroke();
      }
      for (const v of [-1, -0.5, 0.5, 1]) {
        ctx.beginPath(); ctx.moveTo(X(-H_MAX), Y(v)); ctx.lineTo(X(H_MAX), Y(v)); ctx.stroke();
      }
      ctx.strokeStyle = p.axis;
      ctx.beginPath(); ctx.moveTo(X(-H_MAX), Y(0)); ctx.lineTo(X(H_MAX), Y(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(0), Y(YMAX)); ctx.lineTo(X(0), Y(-YMAX)); ctx.stroke();
      ctx.restore();

      for (const v of [-2, -1, 1, 2]) {
        label(ctx, X(v), h - PAD.b + 14, String(v), { color: p.muted, size: 10, align: 'center' });
      }
      for (const v of [-1, 1]) {
        label(ctx, PAD.l - 7, Y(v) + 3, v.toFixed(0), { color: p.muted, size: 10, align: 'right' });
      }
      label(ctx, w - PAD.r, h - PAD.b + 14, 'H · ê', { color: p.muted, size: 10, align: 'right' });
      label(ctx, PAD.l - 7, Y(0) + 3, '0', { color: p.muted, size: 10, align: 'right' });
      label(ctx, PAD.l + 4, PAD.t + 2, 'M · ê', { color: p.muted, size: 10, baseline: 'top' });

      // saturation of the anhysteretic law currently selected
      ctx.save();
      ctx.strokeStyle = alpha(p.cm, 0.35);
      ctx.lineWidth = 1;
      for (const sign of [1, -1]) {
        ctx.beginPath();
        ctx.moveTo(X(-H_MAX), Y(sign * d.anh.ms));
        ctx.lineTo(X(H_MAX), Y(sign * d.anh.ms));
        ctx.stroke();
      }
      ctx.restore();
      label(ctx, X(-H_MAX) + 4, Y(d.anh.ms) - 4, `Mₛ = ${d.anh.ms.toFixed(2)}`, { color: p.muted, size: 10 });

      // anhysteretic reference
      const ref = [];
      for (let v = -H_MAX; v <= H_MAX + 1e-9; v += 0.02) ref.push([X(v), Y(clampM(anhystScalar(v, d.anh)))]);
      polyline(ctx, ref, { color: p.muted, width: 1.3, alpha: 0.7 });
      label(ctx, X(H_MAX) - 4, Y(clampM(anhystScalar(H_MAX, d.anh))) - 8,
        d.anh.model === 'atan' ? 'anhysteretic (arctan)' : 'anhysteretic (Langevin)',
        { color: p.muted, size: 10, align: 'right' });

      // traced loop
      const e = d.axis;
      const pts = d.samples.map((s) => [
        X(clampH(s.h.x * e.x + s.h.y * e.y)),
        Y(clampM(s.m.x * e.x + s.m.y * e.y)),
      ]);
      polyline(ctx, pts, { color: p.cm, width: 2 });

      const cx = X(clampH(d.hProj)), cy = Y(clampM(d.mProj));
      dot(ctx, cx, cy, 4.5, p.cm, p.surface);
      const flip = cx > w - 70;
      label(ctx, cx + (flip ? -9 : 9), cy + (d.mProj > 0 ? 14 : -8),
        `${d.hProj.toFixed(2)}, ${d.mProj.toFixed(2)}`,
        { color: p.ink2, size: 10.5, align: flip ? 'right' : 'left' });

      if (!d.samples.length) {
        label(ctx, (X(-H_MAX) + X(H_MAX)) / 2, Y(-0.55), 'move the field, or press “Sweep field”',
          { color: p.muted, size: 11, align: 'center' });
      }
    },
  };
}

const clampH = (v) => Math.max(-H_MAX, Math.min(H_MAX, v));
const clampM = (v) => Math.max(-YMAX, Math.min(YMAX, v));
