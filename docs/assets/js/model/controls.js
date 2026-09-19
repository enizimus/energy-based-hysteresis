/* Sliders, buttons and the analogy toggle. Inputs are the source of user intent;
 * sync() pushes the state back into them (sweep, dragging) without fighting the
 * control the user currently holds. */

import * as E from './engine.js';

export function createControls(root, state, onChange) {
  const q = (sel) => root.querySelector(sel);
  const outOf = (input) => input.closest('.ctl').querySelector('output');

  const kappas = [0, 1, 2].map((k) => q(`#kappa${k}`));
  const omegas = [0, 1, 2].map((k) => q(`#omega${k}`));
  const hmag = q('#hmag');
  const theta = q('#theta');
  const sweepBtn = q('#btn-sweep');
  const resetBtn = q('#btn-reset');
  const segBtns = [...root.querySelectorAll('.seg-btn')];

  kappas.forEach((input, k) => input.addEventListener('input', () => {
    E.setKappa(state, k, Number(input.value));
    onChange();
  }));
  omegas.forEach((input, k) => input.addEventListener('input', () => {
    E.setOmega(state, k, Number(input.value));
    onChange();
  }));
  hmag.addEventListener('input', () => {
    state.sweep = null;
    E.setDrive(state, Number(hmag.value), state.thetaDeg);
    onChange();
  });
  theta.addEventListener('input', () => {
    E.setDrive(state, state.s, Number(theta.value));
    onChange();
  });

  sweepBtn.addEventListener('click', () => { E.toggleSweep(state); onChange(); });
  resetBtn.addEventListener('click', () => { E.resetState(state); onChange(); });

  segBtns.forEach((btn) => btn.addEventListener('click', () => {
    state.frictionMode = btn.dataset.mode;
    segBtns.forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    onChange();
  }));

  return {
    sync() {
      const w = E.weights(state);
      kappas.forEach((input, k) => {
        const v = state.cells[k].kappa;
        if (document.activeElement !== input) input.value = String(v);
        outOf(input).textContent = v.toFixed(2);
      });
      omegas.forEach((input, k) => {
        if (document.activeElement !== input) input.value = String(state.cells[k].omega);
        outOf(input).textContent = `${Math.round(w[k] * 100)}%`;
      });
      if (document.activeElement !== hmag) hmag.value = String(state.s);
      outOf(hmag).textContent = state.s.toFixed(2);
      if (document.activeElement !== theta) theta.value = String(state.thetaDeg);
      outOf(theta).textContent = `${Math.round(state.thetaDeg)}°`;
      sweepBtn.textContent = state.sweep ? 'Stop sweep' : 'Sweep field';
    },
  };
}
