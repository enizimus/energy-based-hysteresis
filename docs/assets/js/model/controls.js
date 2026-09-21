/* Sliders, buttons and the analogy toggle. Inputs are the source of user intent;
 * sync() pushes the state back into them (sweep, dragging) without fighting the
 * control the user currently holds. */

import * as E from './engine.js';

export function createControls(root, state, onChange) {
  const q = (sel) => root.querySelector(sel);
  const outOf = (input) => input.closest('.ctl').querySelector('output');

  const kappas = [0, 1, 2].map((k) => q(`#kappa${k}`));
  const omegas = [0, 1, 2].map((k) => q(`#omega${k}`));
  // the drive magnitude has one slider under the analogy and one under the parameters
  const hmags = [...root.querySelectorAll('input[data-drive="h"]')];
  const theta = q('#theta');
  const ms = q('#ms');
  const ashape = q('#ashape');
  const aName = q('#ctl-a-name');
  const pshape = q('#pshape');
  const pCtl = q('#ctl-p');
  const sweepBtn = q('#btn-sweep');
  const resetBtn = q('#btn-reset');
  const viewBtns = [...root.querySelectorAll('.seg-btn[data-mode]')];
  const lawBtns = [...root.querySelectorAll('.seg-btn[data-anh]')];

  kappas.forEach((input, k) => input.addEventListener('input', () => {
    E.setKappa(state, k, Number(input.value));
    onChange();
  }));
  omegas.forEach((input, k) => input.addEventListener('input', () => {
    E.setOmega(state, k, Number(input.value));
    onChange();
  }));
  ms.addEventListener('input', () => { E.setMs(state, Number(ms.value)); onChange(); });
  ashape.addEventListener('input', () => { E.setAnhA(state, Number(ashape.value)); onChange(); });
  pshape.addEventListener('input', () => { E.setAnhP(state, Number(pshape.value)); onChange(); });

  hmags.forEach((input) => input.addEventListener('input', () => {
    state.sweep = null;
    E.setDrive(state, Number(input.value), state.thetaDeg);
    onChange();
  }));
  theta.addEventListener('input', () => {
    E.setDrive(state, state.s, Number(theta.value));
    onChange();
  });

  sweepBtn.addEventListener('click', () => { E.toggleSweep(state); onChange(); });
  resetBtn.addEventListener('click', () => { E.resetState(state); onChange(); });

  const pressOnly = (group, btn) => group.forEach((b) => {
    const on = b === btn;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });

  viewBtns.forEach((btn) => btn.addEventListener('click', () => {
    state.frictionMode = btn.dataset.mode;
    pressOnly(viewBtns, btn);
    onChange();
  }));

  lawBtns.forEach((btn) => btn.addEventListener('click', () => {
    E.setAnhModel(state, btn.dataset.anh);
    pressOnly(lawBtns, btn);
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
      const anh = E.anhOf(state);
      if (document.activeElement !== ms) ms.value = String(anh.ms);
      outOf(ms).textContent = anh.ms.toFixed(2);
      if (document.activeElement !== ashape) ashape.value = String(anh.a);
      outOf(ashape).textContent = anh.a.toFixed(2);
      aName.textContent = anh.model === 'atan' ? 'A' : 'a';
      pCtl.hidden = anh.model !== 'atan';          // the exponent belongs to the arctangent law only
      if (document.activeElement !== pshape) pshape.value = String(anh.p);
      outOf(pshape).textContent = anh.p.toFixed(2);

      hmags.forEach((input) => {
        if (document.activeElement !== input) input.value = String(state.s);
        outOf(input).textContent = state.s.toFixed(2);
      });
      if (document.activeElement !== theta) theta.value = String(state.thetaDeg);
      outOf(theta).textContent = `${Math.round(state.thetaDeg)}°`;
      sweepBtn.textContent = state.sweep ? 'Stop sweep' : 'Sweep field';
    },
  };
}
