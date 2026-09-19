/* Theme tokens read straight from CSS, so canvas and SVG follow the page theme. */

const KEYS = ['page', 'surface', 'ink', 'ink-2', 'muted', 'grid', 'axis', 'border', 'c1', 'c2', 'c3', 'cm'];
let cache = null;

export function palette() {
  if (cache) return cache;
  const cs = getComputedStyle(document.documentElement);
  const p = {};
  for (const key of KEYS) p[key.replace('-', '')] = cs.getPropertyValue('--' + key).trim() || '#888';
  p.cells = [p.c1, p.c2, p.c3];
  cache = p;
  return p;
}

export function invalidatePalette() { cache = null; }

/** Blend a hex colour toward transparency (canvas fills and faint strokes). */
export function alpha(hex, a) {
  const h = hex.trim();
  if (h.startsWith('rgb')) return h;
  const n = h.length === 4
    ? h.slice(1).split('').map((c) => parseInt(c + c, 16))
    : [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${n[0]}, ${n[1]}, ${n[2]}, ${a})`;
}
