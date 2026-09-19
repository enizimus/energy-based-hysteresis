/* Minimal SVG builders — every figure is rebuilt from scratch on each render. */

const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, children = []) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    node.setAttribute(k, String(v));
  }
  for (const c of children) node.appendChild(c);
  return node;
}

export function text(x, y, content, attrs = {}) {
  const node = el('text', { x, y, 'font-size': 11, ...attrs });
  node.textContent = content;
  return node;
}

/** Zig-zag spring from a to b, with rounded lead-ins at both ends. */
export function spring(ax, ay, bx, by, { coils = 7, amp = 6 } = {}) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 8) return `M${ax},${ay} L${bx},${by}`;
  const ux = dx / len, uy = dy / len;      // along
  const px = -uy, py = ux;                 // perpendicular
  const lead = Math.min(10, len * 0.22);
  const seg = (len - 2 * lead) / (coils * 2);
  let d = `M${ax},${ay} L${ax + ux * lead},${ay + uy * lead}`;
  let t = lead;
  for (let i = 0; i < coils * 2; i++) {
    t += seg;
    const off = (i % 2 ? amp : -amp) * Math.min(1, len / 40);
    d += ` L${ax + ux * t + px * off},${ay + uy * t + py * off}`;
  }
  return d + ` L${bx},${by}`;
}

/** Arrow as a path (shaft + head), so it inherits one stroke colour. */
export function arrow(ax, ay, bx, by, { head = 7, width = 2, color = 'currentColor', opacity = 1, dash = null } = {}) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  const g = el('g', { opacity });
  if (len < 0.5) return g;
  const ux = dx / len, uy = dy / len;
  const tipBack = Math.min(head, len);
  g.appendChild(el('line', {
    x1: ax, y1: ay, x2: bx - ux * tipBack * 0.75, y2: by - uy * tipBack * 0.75,
    stroke: color, 'stroke-width': width, 'stroke-linecap': 'round',
    ...(dash ? { 'stroke-dasharray': dash } : {}),
  }));
  const wing = head * 0.52;
  g.appendChild(el('path', {
    d: `M${bx},${by} L${bx - ux * tipBack + -uy * wing},${by - uy * tipBack + ux * wing} ` +
       `L${bx - ux * tipBack + uy * wing},${by - uy * tipBack - ux * wing} Z`,
    fill: color,
  }));
  return g;
}

/** Hatched ground: a rule with tick marks underneath. */
export function ground(x1, x2, y, color, step = 11) {
  const g = el('g', { stroke: color, 'stroke-width': 1 });
  g.appendChild(el('line', { x1, y1: y, x2, y2: y, 'stroke-width': 1.5 }));
  for (let x = x1; x < x2; x += step) {
    g.appendChild(el('line', { x1: x, y1: y, x2: x - 6, y2: y + 7, opacity: 0.7 }));
  }
  return g;
}
