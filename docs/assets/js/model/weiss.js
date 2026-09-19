/* Simplified Weiss cells: twelve magnetisation cells shared out by the weights,
 * each magnetised along its own reversible field, summed head-to-tail into M. */

import { el, text, arrow } from './svg.js';
import { palette } from './palette.js';
import { KAPPA_MAX } from './engine.js';

const W = 540, HGT = 300;
const TILES = 12, COLS = 4, TILE = 60, GAP = 7;
const GX = 14, GY = 46;
const OX = 408, OY = 152, RUNIT = 62;   // resultant panel: px per unit magnetisation
const SUB = ['₁', '₂', '₃'];

// fixed defect positions inside a tile, revealed one by one as kappa grows
const DEFECTS = [[15, 17], [43, 24], [22, 44], [47, 47], [32, 12]];

export function createWeiss(host) {
  return {
    render(d) {
      const p = palette();
      const svg = el('svg', { viewBox: `0 0 ${W} ${HGT}`, role: 'img',
        'aria-label': 'Twelve Weiss cells, each magnetised along its own reversible field, summed into the total magnetisation.' });

      const counts = allocate(d.cells.map((c) => c.w), TILES);
      const owner = [];
      counts.forEach((n, k) => { for (let i = 0; i < n; i++) owner.push(k); });

      svg.appendChild(text(GX, 22, 'cells shared out by ωₖ', { fill: p.muted, 'font-size': 10.5 }));

      owner.forEach((k, i) => {
        const c = d.cells[k];
        const color = p.cells[k];
        const x = GX + (i % COLS) * (TILE + GAP);
        const y = GY + Math.floor(i / COLS) * (TILE + GAP);

        svg.appendChild(el('rect', { x, y, width: TILE, height: TILE, rx: 6,
          fill: color, 'fill-opacity': 0.07, stroke: color, 'stroke-opacity': 0.45, 'stroke-width': 1 }));

        const nDef = Math.round((c.kappa / KAPPA_MAX) * DEFECTS.length);
        for (let j = 0; j < nDef; j++) {
          svg.appendChild(el('circle', { cx: x + DEFECTS[j][0], cy: y + DEFECTS[j][1], r: 1.7,
            fill: p.muted, opacity: 0.75 }));
        }

        const cx = x + TILE / 2, cy = y + TILE / 2;
        const rel = Math.min(1, c.mMag / d.anh.ms);
        if (rel < 0.03) {
          svg.appendChild(el('circle', { cx, cy, r: 4, fill: 'none', stroke: color, 'stroke-width': 1.4, opacity: 0.8 }));
        } else {
          const len = 10 + 34 * rel;
          const ux = Math.cos(c.mAngle), uy = -Math.sin(c.mAngle);
          svg.appendChild(arrow(cx - ux * len / 2, cy - uy * len / 2, cx + ux * len / 2, cy + uy * len / 2,
            { color, width: 2, head: 7 }));
        }
        svg.appendChild(text(x + 6, y + 13, String(k + 1), { fill: color, 'font-size': 9, 'font-weight': 600, opacity: 0.8 }));
      });

      svg.appendChild(text(GX, 258, 'arrow = Man(Hᵣ,ₖ)   dots = pinning defects ∝ κₖ', { fill: p.muted, 'font-size': 10.5 }));

      drawResultant(svg, d, p);
      host.replaceChildren(svg);
    },
  };
}

function drawResultant(svg, d, p) {
  svg.appendChild(text(OX - RUNIT, 22, 'superposition', { fill: p.muted, 'font-size': 10.5 }));
  const rsat = d.anh.ms * RUNIT;
  svg.appendChild(el('circle', { cx: OX, cy: OY, r: rsat, fill: 'none', stroke: p.grid, 'stroke-width': 1 }));
  svg.appendChild(text(OX + rsat + 4, OY + 12, 'Mₛ', { fill: p.muted, 'font-size': 10 }));

  // applied-field direction (magnitude is not comparable — direction only)
  if (d.Hmag > 1e-6) {
    const ux = d.H.x / d.Hmag, uy = -d.H.y / d.Hmag;
    svg.appendChild(arrow(OX, OY, OX + ux * (rsat + 12), OY + uy * (rsat + 12),
      { color: p.ink, width: 1.4, head: 7, opacity: 0.55 }));
    svg.appendChild(text(OX + ux * (rsat + 20), OY + uy * (rsat + 20) + 4, 'H',
      { fill: p.ink, 'font-size': 11, 'font-weight': 600, 'text-anchor': 'middle', opacity: 0.8 }));
  }

  // weighted cell contributions, head to tail — this is the sum in line 5
  let tx = OX, ty = OY;
  d.cells.forEach((c) => {
    const nx = tx + c.w * c.m.x * RUNIT, ny = ty - c.w * c.m.y * RUNIT;
    if (Math.hypot(nx - tx, ny - ty) > 1.5) {
      svg.appendChild(arrow(tx, ty, nx, ny, { color: p.cells[c.index], width: 1.6, head: 6, opacity: 0.9 }));
    }
    tx = nx; ty = ny;
  });

  if (d.Mmag > 1e-4) {
    svg.appendChild(arrow(OX, OY, OX + d.M.x * RUNIT, OY - d.M.y * RUNIT, { color: p.cm, width: 2.6, head: 9 }));
    svg.appendChild(text(OX + d.M.x * RUNIT * 0.62 + 10, OY - d.M.y * RUNIT * 0.62 - 6, 'M',
      { fill: p.cm, 'font-size': 12, 'font-weight': 600 }));
  }
  svg.appendChild(el('circle', { cx: OX, cy: OY, r: 2.5, fill: p.ink2 }));

  const lag = d.Hmag > 1e-6 && d.Mmag > 1e-4 ? `∠(H, M) = ${d.lagDeg.toFixed(0)}°` : '';
  svg.appendChild(text(OX, 276, lag, { fill: p.muted, 'font-size': 10.5, 'text-anchor': 'middle' }));
  svg.appendChild(text(OX, 258, `‖M‖ = ${d.Mmag.toFixed(3)}`,
    { fill: p.ink2, 'font-size': 11, 'text-anchor': 'middle' }));
}

/** Largest-remainder share-out of `total` tiles over the weights. */
function allocate(weights, total) {
  const raw = weights.map((w) => w * total);
  const base = raw.map(Math.floor);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
  let rest = total - base.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0; i++, rest--) base[order[i % order.length][1]] += 1;
  return base;
}
