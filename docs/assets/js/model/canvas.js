/* Shared canvas plumbing: device-pixel-ratio fit, arrows, dots. */

export function prepare(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return { ctx, w, h };
}

export function drawArrow(ctx, ax, ay, bx, by, { color, width = 2, dash = null, head = 9, alpha = 1 } = {}) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 0.6) return;
  const ux = dx / len, uy = dy / len;
  const tip = Math.min(head, len * 0.9);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash || []);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx - ux * tip * 0.8, by - uy * tip * 0.8);
  ctx.stroke();
  ctx.setLineDash([]);
  const wing = tip * 0.5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx - ux * tip - uy * wing, by - uy * tip + ux * wing);
  ctx.lineTo(bx - ux * tip + uy * wing, by - uy * tip - ux * wing);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A marker with a 2px surface ring, so it reads over any mark it overlaps. */
export function dot(ctx, x, y, r, fill, ring) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (ring) { ctx.lineWidth = 2; ctx.strokeStyle = ring; ctx.stroke(); }
}

export function polyline(ctx, pts, { color, width = 1.5, alpha = 1 }) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.restore();
}

export function label(ctx, x, y, s, { color, size = 11, weight = 400, align = 'left', baseline = 'alphabetic' }) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(s, x, y);
  ctx.restore();
}
