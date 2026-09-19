/* Energy-based vector hysteresis model — state and solver.
 *
 * Per cell k with pinning force kappa_k and weight omega_k:
 *   H          = Hr_k + Hi_k            (reversible + irreversible split)
 *   |Hi_k|    <= kappa_k                (dry-friction bound)
 *   Hr_k       = play_{kappa_k}(H)      (vector play operator, carries the memory)
 *   M          = sum_k w_k * Man(Hr_k)  (Man = Langevin anhysteretic)
 *
 * The applied-field path is the only thing stored; the cell states are a pure
 * function of it, so changing kappa or omega simply replays the path.
 */

export const N_CELLS = 3;
export const H_MAX = 2.0;          // |H| limit, dimensionless
export const KAPPA_MAX = 1.2;
export const MS = 1.0;             // saturation magnetisation (units of Ms)
export const A_LANG = 0.30;        // Langevin shape parameter
export const SAMPLE_MAX = 4000;    // path length cap
export const STEP_MAX = 0.04;      // field path is subdivided to this resolution

const EPS = 1e-9;

/* ── small vector helpers ────────────────────────────────────────────── */
export const v = (x = 0, y = 0) => ({ x, y });
export const norm = (a) => Math.hypot(a.x, a.y);
const copy = (a) => ({ x: a.x, y: a.y });

/* ── constitutive laws ───────────────────────────────────────────────── */

/** Langevin function L(x) = coth(x) - 1/x, with a series near 0. */
export function langevin(x) {
  const ax = Math.abs(x);
  if (ax < 1e-3) return x / 3 - (x * x * x) / 45;
  if (ax > 30) return Math.sign(x) * (1 - 1 / ax);
  return 1 / Math.tanh(x) - 1 / x;
}

/** Anhysteretic magnetisation evaluated at the reversible field. */
export function anhysteretic(hr) {
  const n = norm(hr);
  if (n < EPS) return v(0, 0);
  const m = MS * langevin(n / A_LANG);
  return v((m * hr.x) / n, (m * hr.y) / n);
}

/** Scalar anhysteretic magnitude, for the reference curve on the loop plot. */
export const anhystScalar = (h) => MS * langevin(h / A_LANG);

/**
 * Vector play operator: drag `hr` no further than the boundary of the ball of
 * radius `kappa` centred on it. Returns the new state and whether it moved.
 */
export function play(hr, H, kappa) {
  const dx = H.x - hr.x, dy = H.y - hr.y;
  const d = Math.hypot(dx, dy);
  if (d <= kappa + EPS || d < EPS) return { hr: copy(hr), moved: false, stretch: d };
  const s = kappa / d;
  return { hr: v(H.x - dx * s, H.y - dy * s), moved: true, stretch: kappa };
}

/* ── state ───────────────────────────────────────────────────────────── */

export function createState() {
  const kappas = [0.12, 0.40, 0.85];
  const omegas = [0.50, 0.30, 0.20];
  return {
    cells: kappas.map((kappa, k) => ({ kappa, omega: omegas[k], hr: v(), status: 'stick' })),
    H: v(),                 // applied field
    s: 0,                   // signed field along the drive axis (slider value)
    thetaDeg: 0,            // drive axis angle
    base: kappas.map(() => v()),  // cell state at the head of the stored path
    samples: [],            // [{ h, m, hr:[…] }] — the replayed path
    sweep: null,
    frictionMode: '1d',
  };
}

export const axisOf = (state) => {
  const t = (state.thetaDeg * Math.PI) / 180;
  return v(Math.cos(t), Math.sin(t));
};

export function weights(state) {
  const sum = state.cells.reduce((a, c) => a + c.omega, 0);
  if (sum < EPS) return state.cells.map(() => 1 / N_CELLS);
  return state.cells.map((c) => c.omega / sum);
}

export function totalM(hrs, w) {
  let x = 0, y = 0;
  for (let k = 0; k < hrs.length; k++) {
    const m = anhysteretic(hrs[k]);
    x += w[k] * m.x;
    y += w[k] * m.y;
  }
  return v(x, y);
}

function classify(stretch, kappa, moved) {
  if (moved) return 'slip';
  if (kappa > EPS && stretch >= kappa - 1e-6) return 'limit';
  return 'stick';
}

/** One field increment: advance every cell, append one sample. */
function advance(state, H) {
  const w = weights(state);
  const hrs = [];
  for (const cell of state.cells) {
    const r = play(cell.hr, H, cell.kappa);
    cell.hr = r.hr;
    cell.status = classify(r.stretch, cell.kappa, r.moved);
    hrs.push(copy(r.hr));
  }
  state.H = copy(H);
  state.samples.push({ h: copy(H), m: totalM(hrs, w), hr: hrs });
  trim(state);
}

function trim(state) {
  if (state.samples.length <= SAMPLE_MAX) return;
  const drop = Math.floor(SAMPLE_MAX * 0.2);
  state.base = state.samples[drop].hr.map(copy);
  state.samples.splice(0, drop + 1);
}

/**
 * Set the applied field, subdividing long jumps so the drawn path and the
 * trails stay continuous (the play operator itself is rate independent).
 */
export function setField(state, x, y) {
  let H = v(x, y);
  const n = norm(H);
  if (n > H_MAX) H = v((H.x / n) * H_MAX, (H.y / n) * H_MAX);

  const from = state.H;
  const dist = Math.hypot(H.x - from.x, H.y - from.y);
  if (dist < 1e-5 && state.samples.length) { state.H = H; return false; }

  const steps = Math.max(1, Math.min(400, Math.ceil(dist / STEP_MAX)));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    advance(state, v(from.x + (H.x - from.x) * t, from.y + (H.y - from.y) * t));
  }
  return true;
}

/** Drive along the axis: H = s * e(theta). */
export function setDrive(state, s, thetaDeg) {
  state.s = Math.max(-H_MAX, Math.min(H_MAX, s));
  state.thetaDeg = thetaDeg;
  const e = axisOf(state);
  return setField(state, state.s * e.x, state.s * e.y);
}

/** Free 2-D drag: the slider then shows the projection on the drive axis. */
export function dragField(state, x, y) {
  const changed = setField(state, x, y);
  const e = axisOf(state);
  state.s = state.H.x * e.x + state.H.y * e.y;
  return changed;
}

/** Replay the stored path from the retained base state (after a κ/ω change). */
export function recompute(state) {
  const w = weights(state);
  const hrs = state.base.map(copy);
  let last = null;
  for (const sample of state.samples) {
    for (let k = 0; k < N_CELLS; k++) {
      hrs[k] = play(hrs[k], sample.h, state.cells[k].kappa).hr;
    }
    sample.hr = hrs.map(copy);
    sample.m = totalM(sample.hr, w);
    last = sample;
  }
  // re-derive the live cell state from the replayed path
  state.cells.forEach((cell, k) => {
    const hr = last ? last.hr[k] : state.base[k];
    const r = play(hr, state.H, cell.kappa);
    cell.hr = r.hr;
    cell.status = classify(r.stretch, cell.kappa, r.moved);
  });
  if (last) { last.hr = state.cells.map((c) => copy(c.hr)); last.m = totalM(last.hr, w); }
}

export function setKappa(state, k, value) {
  state.cells[k].kappa = Math.max(0, Math.min(KAPPA_MAX, value));
  recompute(state);
}

export function setOmega(state, k, value) {
  state.cells[k].omega = Math.max(0, Math.min(1, value));
  recompute(state);
}

/** Back to the virgin state: every cell demagnetised, history cleared. */
export function resetState(state) {
  state.cells.forEach((c) => { c.hr = v(); c.status = 'stick'; });
  state.base = state.cells.map(() => v());
  state.samples = [];
  state.H = v();
  state.s = 0;
  state.sweep = null;
}

/* ── sweep animation ─────────────────────────────────────────────────── */

const SWEEP_RATE = 2.4; // field units per second

export function toggleSweep(state) {
  state.sweep = state.sweep ? null : { targets: [H_MAX, -H_MAX, H_MAX], i: 0 };
  return !!state.sweep;
}

export function stepSweep(state, dt) {
  const sw = state.sweep;
  if (!sw) return false;
  const target = sw.targets[sw.i];
  const step = SWEEP_RATE * Math.min(dt, 0.05);
  let s = state.s;
  if (Math.abs(target - s) <= step) { s = target; sw.i += 1; } else { s += Math.sign(target - s) * step; }
  setDrive(state, s, state.thetaDeg);
  if (sw.i >= sw.targets.length) state.sweep = null;
  return true;
}

/* ── derived snapshot, shared by every renderer ──────────────────────── */

export function derive(state) {
  const w = weights(state);
  const e = axisOf(state);
  const cells = state.cells.map((cell, k) => {
    const hi = v(state.H.x - cell.hr.x, state.H.y - cell.hr.y);
    const m = anhysteretic(cell.hr);
    return {
      index: k,
      kappa: cell.kappa,
      omega: cell.omega,
      w: w[k],
      hr: cell.hr,
      hi,
      hrMag: norm(cell.hr),
      hiMag: norm(hi),
      m,
      mMag: norm(m),
      mAngle: norm(m) > EPS ? Math.atan2(m.y, m.x) : 0,
      status: cell.status,
    };
  });
  const M = totalM(state.cells.map((c) => c.hr), w);
  const Hmag = norm(state.H);
  const Mmag = norm(M);
  let lag = 0;
  if (Hmag > EPS && Mmag > EPS) {
    const c = (state.H.x * M.x + state.H.y * M.y) / (Hmag * Mmag);
    lag = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  }
  return {
    cells, M, Mmag, Hmag,
    H: state.H,
    axis: e,
    s: state.s,
    thetaDeg: state.thetaDeg,
    hProj: state.H.x * e.x + state.H.y * e.y,
    mProj: M.x * e.x + M.y * e.y,
    mAngle: Mmag > EPS ? Math.atan2(M.y, M.x) : 0,
    lagDeg: lag,
    samples: state.samples,
    frictionMode: state.frictionMode,
    sweeping: !!state.sweep,
  };
}
