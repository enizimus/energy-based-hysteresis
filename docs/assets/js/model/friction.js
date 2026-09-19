/* Mechanical analogy: blocks held by dry friction, pulled through springs.
 *   hand position   = applied field H
 *   block position  = reversible field Hr,k
 *   spring stretch  = irreversible field Hi,k   (bounded by the friction force kappa_k)
 */

import { el, text, spring, arrow, ground } from './svg.js';
import { palette } from './palette.js';
import { H_MAX } from './engine.js';

const W = 540, HGT = 300;
const SUB = ['₁', '₂', '₃'];
const STATUS = { stick: 'stick', limit: 'at limit', slip: 'slipping' };

const NOTES = {
  '1d': 'Side view, projected on the drive axis ê. The pale band is the friction limit ±κₖ — the hand can move anywhere inside it before the block follows.',
  '2d': 'Top view, the honest vector picture: the friction limit is a circle of radius κₖ. This is the same geometry as the field plane below.',
};

export function createFriction(host, noteEl) {
  return {
    render(d) {
      const p = palette();
      const svg = el('svg', { viewBox: `0 0 ${W} ${HGT}`, role: 'img',
        'aria-label': 'Mechanical analogy: one block per cell, pulled through a spring against dry friction.' });
      (d.frictionMode === '2d' ? draw2d : draw1d)(svg, d, p);
      host.replaceChildren(svg);
      if (noteEl) noteEl.textContent = NOTES[d.frictionMode];
    },
  };
}

/* ── 1-D side view ───────────────────────────────────────────────────── */

const X0 = 78, X1 = 512;
const xOf = (u) => X0 + ((u + H_MAX) / (2 * H_MAX)) * (X1 - X0);

function draw1d(svg, d, p) {
  const rails = [92, 178, 264];
  const sx = xOf(clamp(d.hProj));

  // the hand: one driver bar pulling every spring
  svg.appendChild(el('line', { x1: sx, y1: 30, x2: sx, y2: 276, stroke: p.ink, 'stroke-width': 1.5, opacity: 0.45 }));
  svg.appendChild(el('rect', { x: sx - 15, y: 16, width: 30, height: 13, rx: 3.5, fill: p.ink }));
  svg.appendChild(text(sx, 12, 'H · ê', { 'text-anchor': 'middle', fill: p.ink, 'font-size': 11, 'font-weight': 600 }));

  d.cells.forEach((c, k) => {
    const gy = rails[k];
    const color = p.cells[k];
    const ur = clamp(dot(c.hr, d.axis));
    const bx = xOf(ur);

    // free-play band: +/- kappa around the block
    const l = xOf(clamp(ur - c.kappa)), r = xOf(clamp(ur + c.kappa));
    svg.appendChild(el('rect', { x: l, y: gy - 30, width: Math.max(1, r - l), height: 30, fill: color, 'fill-opacity': 0.08 }));
    for (const x of [l, r]) {
      svg.appendChild(el('line', { x1: x, y1: gy - 32, x2: x, y2: gy, stroke: color, 'stroke-width': 1, opacity: 0.55 }));
    }
    svg.appendChild(ground(64, 520, gy, p.axis));

    // spring from the driver to the near edge of the block
    const edge = bx + (sx >= bx ? 17 : -17);
    svg.appendChild(el('path', {
      d: spring(sx, gy - 13, edge, gy - 13, { coils: 6, amp: 5 }),
      fill: 'none', stroke: color, 'stroke-width': 1.4, 'stroke-linejoin': 'round', opacity: 0.9,
    }));

    // the block
    svg.appendChild(el('rect', {
      x: bx - 17, y: gy - 26, width: 34, height: 26, rx: 3,
      fill: color, 'fill-opacity': 0.16, stroke: color, 'stroke-width': 1.6,
    }));
    if (c.status === 'slip') {
      const dir = sx >= bx ? 1 : -1;
      svg.appendChild(arrow(bx + dir * 21, gy - 13, bx + dir * 33, gy - 13, { color, head: 6, width: 1.6 }));
    }

    // labels
    svg.appendChild(text(58, gy - 14, `κ${SUB[k]} ${c.kappa.toFixed(2)}`,
      { 'text-anchor': 'end', fill: color, 'font-weight': 600, 'font-size': 11.5 }));
    svg.appendChild(text(58, gy, `ω ${Math.round(c.w * 100)}%`,
      { 'text-anchor': 'end', fill: p.muted, 'font-size': 10.5 }));
    svg.appendChild(text(bx, gy - 34, STATUS[c.status],
      { 'text-anchor': 'middle', fill: c.status === 'stick' ? p.muted : p.ink, 'font-size': 10,
        'font-weight': c.status === 'stick' ? 400 : 600, 'letter-spacing': '.04em' }));
    if (Math.abs(sx - bx) > 34) {
      svg.appendChild(text((sx + edge) / 2, gy - 22, c.hiMag.toFixed(2),
        { 'text-anchor': 'middle', fill: p.muted, 'font-size': 10 }));
    }
  });

  svg.appendChild(text(64, 292, 'block = Hᵣ,ₖ   spring = Hᵢ,ₖ   band = ±κₖ',
    { fill: p.muted, 'font-size': 10.5 }));
}

/* ── 2-D top view ────────────────────────────────────────────────────── */

const CX = 272, CY = 150, HALF = 140, RW = 2.35;
const px = (wx) => CX + (wx / RW) * HALF;
const py = (wy) => CY - (wy / RW) * HALF;

function draw2d(svg, d, p) {
  const defs = el('defs');
  const pat = el('pattern', { id: 'rough', width: 11, height: 11, patternUnits: 'userSpaceOnUse' });
  pat.appendChild(el('circle', { cx: 2.5, cy: 2.5, r: 0.9, fill: p.muted, opacity: 0.4 }));
  defs.appendChild(pat);
  svg.appendChild(defs);

  svg.appendChild(el('rect', { x: CX - HALF, y: CY - HALF, width: HALF * 2, height: HALF * 2, rx: 8, fill: 'url(#rough)' }));
  svg.appendChild(el('rect', { x: CX - HALF, y: CY - HALF, width: HALF * 2, height: HALF * 2, rx: 8,
    fill: 'none', stroke: p.border, 'stroke-width': 1 }));

  const hx = px(d.H.x), hy = py(d.H.y);

  [...d.cells].sort((a, b) => b.kappa - a.kappa).forEach((c) => {
    const color = p.cells[c.index];
    const bx = px(c.hr.x), by = py(c.hr.y);
    const r = (c.kappa / RW) * HALF;
    svg.appendChild(el('circle', { cx: bx, cy: by, r, fill: color, 'fill-opacity': 0.06, stroke: color,
      'stroke-width': 1.3, opacity: 0.85 }));
    svg.appendChild(el('path', { d: spring(bx, by, hx, hy, { coils: 5, amp: 4.5 }), fill: 'none',
      stroke: color, 'stroke-width': 1.3, opacity: 0.85 }));
    svg.appendChild(el('circle', { cx: bx, cy: by, r: 8, fill: color, stroke: p.surface, 'stroke-width': 2 }));
    if (r > 16) {
      svg.appendChild(text(bx + r * 0.71 + 3, by - r * 0.71 - 3, `κ${SUB[c.index]}`,
        { fill: color, 'font-size': 10.5, 'font-weight': 600 }));
    }
  });

  svg.appendChild(el('circle', { cx: hx, cy: hy, r: 5.5, fill: p.ink, stroke: p.surface, 'stroke-width': 2 }));
  svg.appendChild(text(hx + 9, hy - 8, 'H (hand)', { fill: p.ink, 'font-size': 11, 'font-weight': 600 }));

  const lines = [['puck', '= Hᵣ,ₖ'], ['spring', '= Hᵢ,ₖ'], ['circle', '= κₖ'], ['hand', '= H']];
  lines.forEach(([a, b], i) => {
    const y = 46 + i * 19;
    svg.appendChild(text(16, y, a, { fill: p.muted, 'font-size': 10.5 }));
    svg.appendChild(text(62, y, b, { fill: p.ink2, 'font-size': 10.5, 'font-weight': 600 }));
  });
  svg.appendChild(text(16, 282, 'rough table', { fill: p.muted, 'font-size': 10.5 }));
}

/* ── helpers ─────────────────────────────────────────────────────────── */
const dot = (a, b) => a.x * b.x + a.y * b.y;
const clamp = (u) => Math.max(-H_MAX, Math.min(H_MAX, u));
