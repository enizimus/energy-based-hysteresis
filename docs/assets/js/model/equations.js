/* KaTeX rendering of the six model equations (vendored — no network at view time). */

export function renderEquations(root) {
  const nodes = [...root.querySelectorAll('.eq-tex')];
  const paint = () => {
    if (!window.katex) return false;
    for (const node of nodes) {
      window.katex.render(node.dataset.tex, node, { displayMode: true, throwOnError: false });
    }
    return true;
  };
  if (!paint()) window.addEventListener('load', paint, { once: true });
}
