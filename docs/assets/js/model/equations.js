/* KaTeX rendering of the six model equations (vendored — no network at view time). */

const ANHYSTERETIC = {
  langevin: {
    tex: '\\mathbf{M}_{\\mathrm{an}}(\\mathbf{H}_r) = M_s\\,\\mathrm{L}\\!\\left(\\frac{\\lVert\\mathbf{H}_r\\rVert}{a}\\right)\\hat{\\mathbf{H}}_r, '
       + '\\qquad \\mathrm{L}(x)=\\coth x-\\frac{1}{x}',
    cap: 'The reversible, single-valued <b>anhysteretic</b> response &mdash; the <b>Langevin</b> law, '
       + 'with saturation <i>M<sub>s</sub></i> and shape parameter <i>a</i>. It is evaluated at '
       + '<span class="tok tok-r">H<sub>r,k</sub></span> &mdash; never at the applied field.',
  },
  atan: {
    tex: '\\mathbf{M}_{\\mathrm{an}}(\\mathbf{H}_r) = \\frac{2M_s}{\\pi}\\arctan\\!'
       + '\\left(\\frac{\\lVert\\mathbf{H}_r\\rVert}{A}\\right)\\hat{\\mathbf{H}}_r',
    cap: 'The reversible, single-valued <b>anhysteretic</b> response &mdash; the <b>arctangent</b> law, '
       + 'with saturation <i>M<sub>s</sub></i> and shape parameter <i>A</i>. It approaches saturation far '
       + 'more slowly than the Langevin law, which shows up as broader shoulders on the loop.',
  },
};

let shownModel = null;

/** Draw the anhysteretic line for the law currently selected. Cheap no-op if unchanged. */
export function renderAnhysteretic(model) {
  const law = ANHYSTERETIC[model] || ANHYSTERETIC.langevin;
  const tex = document.getElementById('eq-anhyst');
  const cap = document.getElementById('eq-anhyst-cap');
  if (!tex || !cap || !window.katex || model === shownModel) return;
  window.katex.render(law.tex, tex, { displayMode: true, throwOnError: false });
  cap.innerHTML = law.cap;
  shownModel = model;
}

export function renderEquations(root) {
  const nodes = [...root.querySelectorAll('.eq-tex[data-tex]')];
  const paint = () => {
    if (!window.katex) return false;
    for (const node of nodes) {
      window.katex.render(node.dataset.tex, node, { displayMode: true, throwOnError: false });
    }
    return true;
  };
  if (!paint()) window.addEventListener('load', paint, { once: true });
}
